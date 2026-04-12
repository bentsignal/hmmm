import { Agent } from "@convex-dev/agent";
import { generateObject } from "ai";
import { v } from "convex/values";
import z from "zod";

import type { ActionCtx } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { tryCatch } from "../lib/utils";
import { calculateModelCost } from "../user/usage";
import { getModel, modelPresets } from "./models/helpers";
import { agentPrompt, followUpGeneratorPrompt } from "./prompts";
import { logSystemError } from "./thread/helpers";
import { tools } from "./tools";

export const agent = new Agent(components.agent, {
  languageModel: modelPresets.default.model,
  name: "The Thinker",
  instructions: agentPrompt,
  maxSteps: 20,
  tools: tools,
  contextOptions: {
    excludeToolMessages: false,
  },
  callSettings: { maxRetries: 3, temperature: 1.0 },
  usageHandler: async (ctx, args) => {
    const cost = calculateModelCost(
      modelPresets.default,
      args.usage,
      args.providerMetadata,
    );
    await ctx.runMutation(internal.user.usage.log, {
      userId: args.userId ?? "no-user",
      type: "message",
      cost: cost,
    });
  },
});

export const generateResponse = async (
  ctx: ActionCtx,
  prompt: string,
  title?: string,
  userId?: string,
) => {
  const { threadId } = await agent.createThread(ctx, {
    title: title ?? "Response",
    userId,
  });
  const { thread } = await agent.continueThread(ctx, {
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
};

export const streamResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId } = args;
    const { thread } = await agent.continueThread(ctx, {
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
      await logSystemError(
        ctx,
        threadId,
        "G2",
        "Failed to stream response back to user.",
      );
    }
    // stream has completed
    await Promise.allSettled([
      // set thread back to idle
      ctx.runMutation(internal.ai.thread.mutations.setState, {
        threadId: threadId,
        state: "idle",
      }),
      // generate follow up questions
      (async () => {
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
