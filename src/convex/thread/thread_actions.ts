import { generateObject, generateText } from "ai";
import z from "zod";
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import { agent } from "@/convex/agents/agent";
import {
  defaultModel,
  followUpModel,
  titleGeneratorModel,
} from "@/convex/agents/models";
import {
  followUpGeneratorPrompt,
  titleGeneratorPrompt,
} from "@/convex/agents/prompts";
import { calculateModelCost } from "../sub/sub_helpers";
import { logSystemError } from "./thread_helpers";
import { tryCatch } from "@/lib/utils";

// generate title for thread based off of initial prompt
export const generateTitle = internalAction({
  args: {
    message: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await generateText({
      model: titleGeneratorModel.model,
      prompt: args.message,
      system: titleGeneratorPrompt,
    });
    await ctx.runMutation(internal.thread.thread_mutations.updateThreadTitle, {
      threadId: args.threadId,
      title: response.text.trim(),
    });
  },
});

// generate reponse to users prompt in new or existing thread
export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    prompt: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId, userId } = args;
    const { thread } = await agent.continueThread(ctx, {
      threadId: threadId,
    });
    // initiate response
    const { data: result, error: streamInitError } = await tryCatch(
      thread.streamText(
        {
          promptMessageId,
          maxTokens: 32000,
          providerOptions: {
            openrouter: {
              reasoning: {
                max_tokens: 16000,
              },
            },
          },
        },
        { saveStreamDeltas: true },
      ),
    );
    if (streamInitError) {
      logSystemError(
        ctx,
        threadId,
        "G1",
        "Failed to initialize stream generation.",
      );
      await ctx.runMutation(
        internal.thread.thread_mutations.updateThreadState,
        {
          threadId: threadId,
          state: "idle",
        },
      );
      return;
    }
    // stream response back to user
    const { error: streamError } = await tryCatch(
      Promise.all([
        ctx.runMutation(internal.thread.thread_mutations.updateThreadState, {
          threadId: threadId,
          state: "streaming",
        }),
        result.consumeStream(),
      ]),
    );
    if (streamError) {
      logSystemError(
        ctx,
        threadId,
        "G2",
        "Failed to stream response back to user.",
      );
    }
    // stream has completed
    await Promise.allSettled([
      // set thread back to idle
      ctx.runMutation(internal.thread.thread_mutations.updateThreadState, {
        threadId: threadId,
        state: "idle",
      }),
      // generate follow up questions
      (async () => {
        const responseMessage = await result.text;
        const { object: followUpQuestions } = await generateObject({
          model: followUpModel.model,
          prompt: responseMessage,
          system: followUpGeneratorPrompt,
          schema: z.object({
            questions: z.array(z.string()).max(3),
          }),
          maxTokens: 1000,
          maxRetries: 3,
        });
        await ctx.runMutation(
          internal.thread.thread_mutations.saveFollowUpQuestions,
          {
            threadId: threadId,
            followUpQuestions: followUpQuestions.questions,
          },
        );
      })(),
      // log usage
      (async () => {
        const messageUsage = await result.usage;
        const messageCost = calculateModelCost(defaultModel, messageUsage);
        await ctx.runMutation(internal.sub.usage.logMessageUsage, {
          userId: userId,
          messageId: promptMessageId,
          threadId: threadId,
          model: defaultModel.id,
          inputTokens: messageUsage.promptTokens,
          outputTokens: messageUsage.completionTokens,
          cost: messageCost,
        });
      })(),
    ]);
  },
});
