import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    console.log("userId", userId);
    if (!userId) {
      return [];
    }
    const threads = await ctx.db.query("threads").collect();
    return threads;
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.insert("threads", {
      id: args.id,
      user: userId.subject,
      title: args.title,
    });
  },
});
