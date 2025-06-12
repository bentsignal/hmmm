import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getThreadList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return [];
    }
    const threads = await ctx.db
      .query("threads")
      .filter((q) => q.eq(q.field("userId"), userId.subject))
      .collect();
    return threads;
  },
});

export const updateTitle = internalMutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      title: args.title,
    });
  },
});

export const create = mutation({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: validate uuid
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const threadId = await ctx.db.insert("threads", {
      threadId: args.threadId,
      userId: userId.subject,
      title: "New Chat",
    });
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      value: args.message,
      type: "prompt",
    });
    const responseId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      value: "",
      type: "response",
    });
    await Promise.all([
      ctx.scheduler.runAfter(0, internal.actions.generateResponse, {
        message: args.message,
        responseId: responseId,
      }),
      ctx.scheduler.runAfter(0, internal.actions.generateTitle, {
        message: args.message,
        threadId: threadId,
      }),
    ]);
    return threadId;
  },
});
