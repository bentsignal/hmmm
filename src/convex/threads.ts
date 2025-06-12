import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";

export const getThreadList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return [];
    }
    const { page: threads } = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId.subject,
        order: "desc",
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
      },
    );
    return threads;
  },
});

export const getThreadMessages = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return [];
    }
    const metadata = await agent.getThreadMetadata(ctx, {
      threadId: args.threadId,
    });
    if (metadata.userId !== userId.subject) {
      return [];
    }
    const { page: messages } = await agent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: {
        cursor: null,
        numItems: 100,
      },
    });
    return messages.reverse();
  },
});

export const requestThread = mutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { threadId } = await agent.createThread(ctx, {
      userId: userId.subject,
      title: "New Chat",
    });
    await Promise.all([
      ctx.scheduler.runAfter(0, internal.actions.generateTitle, {
        threadId: threadId,
        message: args.message,
      }),
      ctx.scheduler.runAfter(0, internal.threads.continueThread, {
        threadId: threadId,
        userId: userId.subject,
        message: args.message,
      }),
    ]);
    return threadId;
  },
});

export const newThreadMessage = mutation({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    ctx.scheduler.runAfter(0, internal.threads.continueThread, {
      threadId: args.threadId,
      userId: userId.subject,
      message: args.message,
    });
  },
});

export const continueThread = internalAction({
  args: {
    threadId: v.string(),
    userId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread } = await agent.continueThread(ctx, {
      threadId: args.threadId,
    });
    const metadata = await thread.getMetadata();
    if (metadata.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    await thread.generateText({
      prompt: args.message,
    });
  },
});
