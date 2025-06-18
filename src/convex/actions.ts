"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { components } from "./_generated/api";
import modelMap from "@/features/models/types/model-map";
import { publicModels } from "@/features/models/types/models";
import { agent } from "./agent";
import { search } from "@/features/tools";

export const generateTitle = internalAction({
  args: {
    message: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const model = modelMap.get("google/gemma-3-27b-it");
    if (!model) {
      throw new Error("Model not found");
    }
    const response = await generateText({
      model: model,
      prompt: args.message,
      system: `You are a helpful assistant for an AI chatbot. Generate a short, concise title
      for a thread started by the following prompt. Pick a title that is relevant to the prompt, 
      and only return the title, no other text.`,
    });
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: {
        title: response.text.trim(),
      },
    });
  },
});

export const continueThread = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    modelId: v.string(),
    useSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId, modelId, useSearch } = args;
    // get thread
    const { thread } = await agent.continueThread(ctx, {
      threadId: threadId,
      tools: useSearch ? { search } : undefined,
    });
    // select model
    const model = modelMap.get(modelId);
    if (!model) {
      throw new Error("Model not found");
    }
    const isModelPublic = publicModels.some((model) => model.id === modelId);
    if (!isModelPublic) {
      throw new Error("Model is not public");
    }
    // generate repsonse, stream text back to client
    const result = await thread.streamText(
      {
        promptMessageId,
        model: model,
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
    await result.consumeStream();
  },
});
