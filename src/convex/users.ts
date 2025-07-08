import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";

export const createUser = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, email } = args;
    await ctx.db.insert("users", {
      userId,
      email,
      access: false,
      waitlist: false,
    });
  },
});

export const hasAccess = async (ctx: QueryCtx, userId: string) => {
  const user = await getUserByUserId(ctx, userId);
  if (!user) {
    return false;
  }
  return user.access;
};

export const isAdmin = async (ctx: QueryCtx, userId: string) => {
  const user = await getUserByUserId(ctx, userId);
  if (!user) {
    return false;
  }
  return user.admin;
};

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
