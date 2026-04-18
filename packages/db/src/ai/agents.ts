import { generateObject } from "ai";
import { v } from "convex/values";
import z from "zod";

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { Agent } from "../agent/client";
import { agentComponent } from "../agent/component";
import { tryCatch } from "../lib/utils";
import { calculateModelCost } from "../user/usage";
import { getModel, isLanguageModelKey } from "./models/helpers";
import { languageModels } from "./models/language";
import { modelPresets } from "./models/presets";
import { agentPrompt, followUpGeneratorPrompt } from "./prompts";
import { logSystemError } from "./thread/helpers";
import { tools } from "./tools";

export const agent = new Agent(agentComponent, {
  languageModel: modelPresets.default.model,
  name: "The Thinker",
  instructions: agentPrompt,
  maxSteps: 20,
  tools: tools,
  contextOptions: {
    excludeToolMessages: false,
  },
  callSettings: { maxRetries: 3 },
  usageHandler: async (ctx, args) => {
    const { model: modelId, usage, providerMetadata } = args;
    // currently this won't work since the modelId will be like google/gemini-3-flash
    // and my model keys are just gemini-3-flash, so they don't match. it shouldn't matter
    // tho because it should be calculated based off of providerMetadata.
    const model = isLanguageModelKey(modelId)
      ? languageModels[modelId]
      : undefined;
    const cost = calculateModelCost({ model, usage, providerMetadata });
    await ctx.runMutation(internal.user.usage.log, {
      userId: args.userId ?? "no-user",
      type: "message",
      cost: cost,
    });
  },
});

export async function generateResponse(
  ctx: ActionCtx,
  prompt: string,
  title?: string,
  userId?: string,
) {
  const { threadId } = await agent.createThread(ctx, {
    title: title ?? "Response",
    userId,
  });
  const { thread } = agent.continueThread(ctx, {
    threadId,
  });
  const result = await thread.generateText({
    prompt,
    maxOutputTokens: 16000,
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 8000,
        },
      },
    },
  });
  return result.text;
}

export const streamResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId } = args;
    const { thread } = agent.continueThread(ctx, {
      threadId: threadId,
    });
    const model = getModel(args.model);
    // initiate response
    const { data: result, error: streamInitError } = await tryCatch(
      thread.streamText(
        {
          model: model.model,
          promptMessageId,
          maxOutputTokens: 64000,
          providerOptions: {
            openrouter: {
              reasoning: {
                max_tokens: 32000,
              },
            },
          },
        },
        { saveStreamDeltas: true },
      ),
    );
    if (streamInitError) {
      const aborted = await ctx.runQuery(
        internal.ai.thread.mutations.wasAborted,
        { threadId },
      );
      if (!aborted) {
        await logSystemError(
          ctx,
          threadId,
          "G1",
          "Failed to initialize stream generation.",
        );
        await ctx.runMutation(internal.ai.thread.mutations.setState, {
          threadId: threadId,
          state: "idle",
        });
      }
      return;
    }
    // stream response back to user
    const { error: streamError } = await tryCatch(
      Promise.all([
        ctx.runMutation(internal.ai.thread.mutations.setState, {
          threadId: threadId,
          state: "streaming",
        }),
        result.consumeStream(),
      ]),
    );
    if (streamError) {
      const aborted = await ctx.runQuery(
        internal.ai.thread.mutations.wasAborted,
        { threadId },
      );
      if (!aborted) {
        await logSystemError(
          ctx,
          threadId,
          "G2",
          "Failed to stream response back to user.",
        );
      }
    }
    // stream has completed
    await Promise.allSettled([
      // set thread back to idle — only if we're still the active stream;
      // a user-triggered abort (or a subsequent generation) will have already
      // moved the thread out of the "streaming" state.
      ctx.runMutation(internal.ai.thread.mutations.resetIdleIfStreaming, {
        threadId: threadId,
      }),
      // generate follow up questions — skip if the user aborted, since
      // running another LLM call on an abandoned response wastes tokens.
      (async () => {
        const aborted = await ctx.runQuery(
          internal.ai.thread.mutations.wasAborted,
          { threadId },
        );
        if (aborted) return;
        const responseMessage = await result.text;
        const { object: followUpQuestions } = await generateObject({
          model: modelPresets.followUp.model,
          prompt: responseMessage,
          system: followUpGeneratorPrompt,
          schema: z.object({
            questions: z.array(z.string().max(300)).max(3),
          }),
          maxOutputTokens: 1000,
          maxRetries: 3,
        });
        await ctx.runMutation(
          internal.ai.thread.mutations.saveFollowUpQuestions,
          {
            threadId: threadId,
            followUpQuestions: followUpQuestions.questions,
          },
        );
      })(),
    ]);
  },
});
