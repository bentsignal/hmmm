"use node";

import { generateObject, generateText } from "ai";
import z from "zod";
import { v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import { agent } from "@/convex/agents/agent";
import {
  classifierModel,
  followUpModel,
  titleGeneratorModel,
} from "@/convex/agents/models";
import { getResponseModel } from "@/convex/agents/models/util";
import {
  followUpGeneratorPrompt,
  getClassifierPrompt,
  titleGeneratorPrompt,
} from "@/convex/agents/prompts";
import {
  promptCategoryEnum,
  promptDifficultyEnum,
} from "@/convex/agents/prompts/types";
import { PlanTier } from "@/convex/sub/sub_types";
import { calculateModelCost } from "../sub/sub_helpers";
import { logSystemError, logSystemNotice } from "./thread_helpers";
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
    await Promise.all([
      ctx.runMutation(internal.thread.thread_mutations.updateThreadTitle, {
        threadId: args.threadId,
        title: response.text.trim(),
      }),
      ctx.runMutation(components.agent.threads.updateThread, {
        threadId: args.threadId,
        patch: {
          title: response.text.trim(),
        },
      }),
    ]);
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
    const { threadId, promptMessageId, prompt, userId } = args;
    // get thread info & previous category classification
    const [category, { thread }] = await Promise.all([
      ctx.runQuery(internal.thread.thread_queries.getThreadCategory, {
        threadId: threadId,
      }),
      agent.continueThread(ctx, {
        threadId: threadId,
      }),
    ]);
    // classify the user's prompt by category and difficulty, get their current plan
    const classificationResult = await tryCatch(
      Promise.all([
        generateObject({
          model: classifierModel.model,
          schema: z.object({
            promptDifficulty: promptDifficultyEnum,
            promptCategory: promptCategoryEnum,
          }),
          prompt: getClassifierPrompt(prompt, category),
        }),
        ctx.runQuery(internal.sub.sub_queries.getPlanTier, {
          userId: userId,
        }),
      ]),
    );
    if (classificationResult.error) {
      logSystemError(ctx, threadId, "G3", "Failed to classify user's prompt.");
      await ctx.runMutation(
        internal.thread.thread_mutations.updateThreadState,
        {
          threadId: threadId,
          state: "idle",
        },
      );
      return;
    }
    const [{ object, usage: classificationUsage }, tier] =
      classificationResult.data;
    // free tier users can't access web search, log notice in their thread
    if (tier === PlanTier.Free && object.promptCategory === "search") {
      await logSystemNotice(ctx, threadId, "N1");
      await ctx.runMutation(
        internal.thread.thread_mutations.updateThreadState,
        {
          threadId: threadId,
          state: "idle",
        },
      );
      return;
    }
    // determine which model to use based on the prompt classification
    const chosenModel = getResponseModel(
      object.promptCategory,
      object.promptDifficulty,
      tier,
    );
    // initiate response
    const { data: result, error: streamInitError } = await tryCatch(
      thread.streamText(
        {
          promptMessageId,
          model: chosenModel.model,
          maxTokens: 10000,
          providerOptions: {
            openrouter: chosenModel.openrouterProviderOptions || {},
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
      // store new category
      ctx.runMutation(internal.thread.thread_mutations.updateThreadCategory, {
        threadId: threadId,
        category: object.promptCategory,
      }),
      // generate follow up questions
      (async () => {
        const responseMessage = await result.text;
        const { object: followUpQuestions } = await generateObject({
          model: followUpModel.model,
          prompt: followUpGeneratorPrompt(responseMessage),
          schema: z.object({
            questions: z.array(z.string()).max(3),
          }),
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
        const messageCost = calculateModelCost(chosenModel, messageUsage);
        const classificationCost = calculateModelCost(
          classifierModel,
          classificationUsage,
        );
        const totalCost = messageCost + classificationCost;
        await ctx.runMutation(internal.sub.usage.logMessageUsage, {
          userId: userId,
          messageId: promptMessageId,
          threadId: threadId,
          category: object.promptCategory,
          difficulty: object.promptDifficulty,
          model: chosenModel.id,
          inputTokens: messageUsage.promptTokens,
          outputTokens: messageUsage.completionTokens,
          cost: totalCost,
        });
      })(),
    ]);
  },
});
