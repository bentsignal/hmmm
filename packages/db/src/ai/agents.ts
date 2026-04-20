import { generateObject } from "ai";
import { v } from "convex/values";
import z from "zod";

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { Agent } from "../../lib/agent-client";
import { tryCatch } from "../lib/utils";
import { calculateModelCost } from "../user/usage";
import { getModel, isLanguageModelKey } from "./models/helpers";
import { languageModels } from "./models/language";
import { modelPresets } from "./models/presets";
import { agentPrompt, followUpGeneratorPrompt } from "./prompts";
import { logSystemError } from "./thread/helpers";
import { tools } from "./tools";

const agent = new Agent({
  languageModel: modelPresets.default.model,
  name: "The Thinker",
  instructions: agentPrompt,
  maxSteps: 20,
  tools: tools,
  contextOptions: {
    excludeToolMessages: false,
  },
  // maxRetries intentionally omitted: AI SDK replays the whole generation on
  // transient errors, including after a user abort (since abortById doesn't
  // throw — it silently stops writes). A replay re-streams text the user
  // already cancelled. If we ever need retries, gate them on a predicate that
  // returns false once wasAborted(ctx, threadId, generationId) is true.
  callSettings: { maxRetries: 0 },
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

async function generateFollowUps(
  ctx: ActionCtx,
  args: { threadId: string; responseText: PromiseLike<string> },
) {
  const responseMessage = await args.responseText;
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
  await ctx.runMutation(internal.ai.thread.followUps.save, {
    threadId: args.threadId,
    followUpQuestions: followUpQuestions.questions,
  });
}

export const streamResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    model: v.optional(v.string()),
    generationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { threadId, promptMessageId, generationId } = args;
    const { thread } = agent.continueThread(ctx, { threadId });
    const model = getModel(args.model);
    // Two event emits driven by chunk types:
    //   - `agent_working`: first chunk of any kind (reasoning, tool-call,
    //     source, etc.) — signals the LLM has actually started producing
    //     output. This used to fire at stream setup, but that was before
    //     the LLM emitted anything, so tool sources could render in the UI
    //     via the delta pipeline before the event landed.
    //   - `response_streaming`: first text-delta chunk — the agent has
    //     moved past reasoning/tools and is streaming the final response.
    // If the first chunk IS a text-delta, both fire in sequence.
    let agentWorkingEmitted = false;
    let responseStreamingEmitted = false;
    const { data: result, error: streamInitError } = await tryCatch(
      thread.streamText(
        {
          model: model.model,
          promptMessageId,
          maxOutputTokens: 64000,
          providerOptions: {
            openrouter: { reasoning: { max_tokens: 32000 } },
          },
          onChunk: async ({ chunk }) => {
            if (!agentWorkingEmitted) {
              agentWorkingEmitted = true;
              await ctx.runMutation(internal.ai.thread.events.emit, {
                threadId,
                eventType: "agent_working",
                generationId,
              });
            }
            if (responseStreamingEmitted) return;
            if (chunk.type !== "text-delta") return;
            responseStreamingEmitted = true;
            await ctx.runMutation(internal.ai.thread.events.emit, {
              threadId,
              eventType: "response_streaming",
              generationId,
            });
          },
        },
        { saveStreamDeltas: true },
      ),
    );
    if (streamInitError) {
      const aborted = await ctx.runQuery(internal.ai.thread.state.wasAborted, {
        threadId,
        generationId,
      });
      if (!aborted) {
        await logSystemError(
          ctx,
          threadId,
          "G1",
          "Failed to initialize stream generation.",
        );
      }
      await ctx.runMutation(internal.ai.thread.events.clearForGeneration, {
        generationId,
      });
      return;
    }
    const { error: streamError } = await tryCatch(
      Promise.resolve(result.consumeStream()),
    );
    if (streamError) {
      const aborted = await ctx.runQuery(internal.ai.thread.state.wasAborted, {
        threadId,
        generationId,
      });
      if (!aborted) {
        await logSystemError(
          ctx,
          threadId,
          "G2",
          "Failed to stream response back to user.",
        );
      }
    }
    // Check wasAborted BEFORE clearing events so the completion path can
    // distinguish natural completion from a user abort that already wiped
    // the cycle's rows.
    const aborted = await ctx.runQuery(internal.ai.thread.state.wasAborted, {
      threadId,
      generationId,
    });
    await ctx.runMutation(internal.ai.thread.events.clearForGeneration, {
      generationId,
    });
    if (!aborted) {
      await generateFollowUps(ctx, { threadId, responseText: result.text });
    }
  },
});
