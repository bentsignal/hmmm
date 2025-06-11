import { mutation, query } from "./_generated/server";
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

export const create = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
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
      title: args.title,
    });
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      value: args.message,
      type: "prompt",
    });
    return threadId;
  },
});
