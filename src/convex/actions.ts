"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { components, internal } from "./_generated/api";
import { agent } from "./agent";
import { generateObject } from "ai";
import z from "zod";
import {
  classifierModel,
  searchModel,
  complexModel,
  generalModel,
  titleGeneratorModel,
} from "./models";
import { classifierPrompt, titleGeneratorPrompt } from "./prompts";

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
    // determine which model will be used
    const { object } = await generateObject({
      model: classifierModel,
      schema: z.object({
        queryType: z.enum(["general", "complex", "search"]),
      }),
      prompt: `${classifierPrompt} The user's prompt is: ${prompt}`,
    });
    const model =
      object.queryType === "search"
        ? searchModel
        : object.queryType === "complex"
          ? complexModel
          : generalModel;
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
