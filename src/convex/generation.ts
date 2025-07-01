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
import { getModelByPromptClassification } from "@/features/models/util/model-utils";

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
    // modelId: v.string(),
    // useSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId, prompt } = args;
    // get thread info & previous category classification
    const [category, { thread }] = await Promise.all([
      ctx.runQuery(internal.threads.getThreadCategory, {
        threadId: threadId,
      }),
      agent.continueThread(ctx, {
        threadId: threadId,
      }),
    ]);
    // classify the user's prompt by category and difficulty
    const { object } = await generateObject({
      model: classifierModel.model,
      schema: z.object({
        promptDifficulty: promptDifficultyEnum,
        promptCategory: promptCategoryEnum,
      }),
      prompt: getClassifierPrompt(prompt, category),
    });
    // determine which model to use based on the prompt classification
    const chosenModel = getModelByPromptClassification(
      object.promptCategory,
      object.promptDifficulty,
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
    // thread is ready to stream response, update state & category
    await Promise.all([
      ctx.runMutation(internal.threads.updateThreadState, {
        threadId: threadId,
        state: "streaming",
      }),
      ctx.runMutation(internal.threads.updateThreadCategory, {
        threadId: threadId,
        category: object.promptCategory,
      }),
    ]);
    // stream response back to user, set back to idle once it has finished
    await result.consumeStream();
    await ctx.runMutation(internal.threads.updateThreadState, {
      threadId: threadId,
      state: "idle",
    });
  },
});
