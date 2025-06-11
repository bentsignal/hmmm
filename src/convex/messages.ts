import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return [];
    }
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .collect();
    return messages;
  },
});

export const create = mutation({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      value: args.message,
      type: "prompt",
    });
  },
});
