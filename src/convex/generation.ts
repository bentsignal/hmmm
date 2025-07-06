"use node";

import { generateText, generateObject } from "ai";
import z from "zod";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { agent } from "./agent";
import { classifierModel, titleGeneratorModel } from "@/features/models";
import { getClassifierPrompt, titleGeneratorPrompt } from "@/features/prompts";
import {
  promptCategoryEnum,
  promptDifficultyEnum,
} from "@/features/prompts/types/prompt-types";
import { getResponseModel } from "@/features/models/util/model-utils";

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
      ctx.runMutation(internal.threads.updateThreadTitle, {
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
export const continueThread = internalAction({
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
      ctx.runQuery(internal.threads.getThreadCategory, {
        threadId: threadId,
      }),
      agent.continueThread(ctx, {
        threadId: threadId,
      }),
    ]);
    // classify the user's prompt by category and difficulty, get their current plan
    const [{ object, usage: classificationUsage }, tier] = await Promise.all([
      generateObject({
        model: classifierModel.model,
        schema: z.object({
          promptDifficulty: promptDifficultyEnum,
          promptCategory: promptCategoryEnum,
        }),
        prompt: getClassifierPrompt(prompt, category),
      }),
      ctx.runQuery(internal.polar.getPlanTier, {
        userId: userId,
      }),
    ]);
    // determine which model to use based on the prompt classification
    const chosenModel = getResponseModel(
      object.promptCategory,
      object.promptDifficulty,
      tier,
    );
    // initiate response
    const result = await thread.streamText(
      {
        promptMessageId,
        model: chosenModel.model,
        providerOptions: {
          openrouter: {
            reasoning: {
              max_tokens: 2000,
            },
          },
        },
      },
      { saveStreamDeltas: true },
    );
    // stream response back to user
    await Promise.all([
      ctx.runMutation(internal.threads.updateThreadState, {
        threadId: threadId,
        state: "streaming",
      }),
      result.consumeStream(),
    ]);
    // stream has completed, set back to idle and store category
    await Promise.all([
      ctx.runMutation(internal.threads.updateThreadState, {
        threadId: threadId,
        state: "idle",
      }),
      ctx.runMutation(internal.threads.updateThreadCategory, {
        threadId: threadId,
        category: object.promptCategory,
      }),
    ]);
    // calculate usage
    const million = 1000000;
    const { promptTokens: inputTokens, completionTokens: outputTokens } =
      await result.usage;
    // cost of prompt & response
    const inputCost = chosenModel.cost.in * (inputTokens / million);
    const outputCost = chosenModel.cost.out * (outputTokens / million);
    // cost to classify prompt category & difficulty
    const classificationCost =
      classifierModel.cost.in * (classificationUsage.promptTokens / million) +
      classifierModel.cost.out *
        (classificationUsage.completionTokens / million);
    // cost of other operations (currently just the flat search rate for perplexity)
    const otherCost = chosenModel.cost.other;
    const totalCost = inputCost + outputCost + classificationCost + otherCost;
    await ctx.runMutation(internal.messages.insertMessageMetadata, {
      messageId: promptMessageId,
      threadId: threadId,
      userId: userId,
      category: object.promptCategory,
      difficulty: object.promptDifficulty,
      model: chosenModel.id,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      inputCost: inputCost,
      outputCost: outputCost,
      otherCost: otherCost,
      totalCost: totalCost,
    });
  },
});
