import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    requestSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, email, requestSecret } = args;
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("CLERK_WEBHOOK_SECRET is not set");
    }
    if (requestSecret !== webhookSecret) {
      throw new Error("Invalid request secret");
    }
    await ctx.db.insert("users", {
      userId,
      email,
      access: false,
      waitlist: false,
    });
  },
});

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId.subject))
      .unique();
    return user;
  },
});
