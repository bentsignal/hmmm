"use node";

import { generateText, generateObject } from "ai";
import z from "zod";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { agent } from "./agent";
import { classifierModel, titleGeneratorModel } from "@/features/models";
import { classifierPrompt, titleGeneratorPrompt } from "@/features/prompts";
import { promptCategoryEnum } from "@/features/models/types/model-types";
import { getModelByPromptCategory } from "@/features/models/util/model-utils";

// generate title for thread based off of initial prompt
export const generateTitle = internalAction({
  args: {
    message: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await generateText({
      model: titleGeneratorModel,
      prompt: args.message,
      system: titleGeneratorPrompt,
    });
    await ctx.runMutation(internal.threads.updateThreadTitle, {
      threadId: args.threadId,
      title: response.text.trim(),
    });
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: {
        title: response.text.trim(),
      },
    });
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
    // get thread
    const { thread } = await agent.continueThread(ctx, {
      threadId: threadId,
    });
    // classify the user's prompt
    const { object } = await generateObject({
      model: classifierModel,
      schema: z.object({
        promptCategory: promptCategoryEnum,
      }),
      prompt: `${classifierPrompt} ${prompt}`,
    });
    // determine which model to use based on the prompt type
    const model = getModelByPromptCategory(object.promptCategory);
    // generate repsonse, stream text back to client
    const result = await thread.streamText(
      {
        promptMessageId,
        model,
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
    await ctx.runMutation(internal.threads.updateThreadState, {
      threadId: threadId,
      state: "streaming",
    });
    await result.consumeStream();
    await ctx.runMutation(internal.threads.updateThreadState, {
      threadId: threadId,
      state: "idle",
    });
  },
});
