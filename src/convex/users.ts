import { v } from "convex/values";
import { mutation, query, internalQuery, QueryCtx } from "./_generated/server";
import { components, internal } from "./_generated/api";

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

export const getUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }
    return await getUserByUserId(ctx, userId.subject);
  },
});

export const getUserByUserId = async (ctx: QueryCtx, userId: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
  return user;
};

export const getUserEmail = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }
    const user = await getUserByUserId(ctx, userId.subject);
    if (!user) {
      return null;
    }
    return user.email;
  },
});

export const requestDeleteUser = mutation({
  args: {},
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // delete all thread & message, and usage
    const [threadMetadata, messageMetadata] = await Promise.all([
      ctx.db
        .query("threadMetadata")
        .withIndex("by_user_time", (q) => q.eq("userId", userId.subject))
        .collect(),
      ctx.db
        .query("messageMetadata")
        .withIndex("by_user_thread", (q) => q.eq("userId", userId.subject))
        .collect(),
    ]);
    await Promise.all([
      threadMetadata.map((metadata) => {
        return ctx.db.delete(metadata._id);
      }),
      messageMetadata.map((metadata) => {
        return ctx.db.delete(metadata._id);
      }),
    ]);

    // delete all user info from agent component
    await ctx.runMutation(components.agent.users.deleteAllForUserIdAsync, {
      userId: userId.subject,
    });

    // delete user from convex
    const user = await getUserByUserId(ctx, userId.subject);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.delete(user._id);

    // delete user from clerk & customer from polar
    await ctx.scheduler.runAfter(0, internal.user_actions.deleteUserAction, {
      userId: userId.subject,
    });
  },
});
