"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { components, internal } from "./_generated/api";
import modelMap from "@/features/models/types/model-map";
import { publicModels, titleGenerator } from "@/features/models/types/models";
import { agent } from "./agent";
import {
  defaultInstructions,
  instructionsWithTools,
  titleGeneratorPrompt,
} from "@/features/prompts/system-prompts";
import { tools } from "@/features/tools";

export const generateTitle = internalAction({
  args: {
    message: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const model = modelMap.get(titleGenerator.id);
    if (!model) {
      throw new Error("Model not found");
    }
    const response = await generateText({
      model: model,
      prompt: args.message,
      system: titleGeneratorPrompt,
    });
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: {
        title: response.text.trim(),
      },
    });
    await ctx.runMutation(internal.threads.updateThreadTitle, {
      threadId: args.threadId,
      title: response.text.trim(),
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
    const { threadId, promptMessageId, modelId } = args;
    // get thread
    const { thread } = await agent.continueThread(ctx, {
      threadId: threadId,
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
    const modelInfo = publicModels.find((model) => model.id === modelId);
    if (!modelInfo) {
      throw new Error("Model not found");
    }
    const instructions = modelInfo.supportsToolCalls
      ? instructionsWithTools
      : defaultInstructions;
    const toolset = modelInfo.supportsToolCalls ? tools : undefined;
    // generate repsonse, stream text back to client
    const result = await thread.streamText(
      {
        promptMessageId,
        model: model,
        system: instructions,
        tools: toolset,
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
