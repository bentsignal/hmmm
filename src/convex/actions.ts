"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { components } from "./_generated/api";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const generateTitle = internalAction({
  args: {
    message: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await generateText({
      model: openRouter.chat("google/gemma-3-4b-it"),
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
