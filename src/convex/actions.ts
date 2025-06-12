"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, smoothStream } from "ai";
import { internal } from "./_generated/api";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const generateResponse = internalAction({
  args: {
    message: v.string(),
    responseId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const response = await streamText({
      model: openRouter.chat("google/gemini-2.5-flash-preview-05-20"),
      prompt: args.message,
      experimental_transform: smoothStream({
        chunking: "word",
      }),
    });
    let fullResponse = "";
    for await (const chunk of response.textStream) {
      fullResponse += chunk;
      await ctx.runMutation(internal.messages.patchResponse, {
        messageId: args.responseId,
        value: fullResponse,
      });
    }
  },
});
