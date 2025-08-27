import { v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import {
  internalMutation,
  mutation,
  QueryCtx,
} from "@/convex/_generated/server";
import { authedQuery } from "../convex_helpers";

/**
 * User's with access have unlimited usage at the highest tier
 * @param ctx
 * @param userId
 * @returns true / false / undefined depending on user access level
 */
export const hasUnlimitedAccess = async (ctx: QueryCtx, userId: string) => {
  const user = await getUserByUserId(ctx, userId);
  if (!user) {
    return false;
  }
  return user.unlimited;
};

export const isAdmin = async (ctx: QueryCtx, userId: string) => {
  const user = await getUserByUserId(ctx, userId);
  if (!user) {
    return false;
  }
  return user.admin;
};

export const getUserByUserId = async (ctx: QueryCtx, userId: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
  return user;
};

export const getEmail = authedQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getUserByUserId(ctx, ctx.user.subject);
    if (!user) {
      return null;
    }
    return user.email;
  },
});

export const create = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, email } = args;
    await ctx.db.insert("users", {
      userId,
      email,
      newsletter: true,
    });
  },
});

export const requestDelete = mutation({
  args: {},
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // delete all threads, messages, and files
    const [threadMetadata, messageMetadata, files] = await Promise.all([
      ctx.db
        .query("threadMetadata")
        .withIndex("by_user_time", (q) => q.eq("userId", userId.subject))
        .collect(),
      ctx.db
        .query("messageMetadata")
        .withIndex("by_user", (q) => q.eq("userId", userId.subject))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_user", (q) => q.eq("userId", userId.subject))
        .collect(),
    ]);
    await Promise.all([
      threadMetadata.map((metadata) => {
        return ctx.db.delete(metadata._id);
      }),
      messageMetadata.map((metadata) => {
        return ctx.db.delete(metadata._id);
      }),
      files.map((file) => {
        return ctx.db.delete(file._id);
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
    await ctx.scheduler.runAfter(0, internal.user.clerk.deleteUser, {
      userId: userId.subject,
    });

    // delete all files from storage
    await ctx.scheduler.runAfter(
      0,
      internal.app.actions.deleteFilesFromStorage,
      {
        keys: files.map((file) => file.key),
      },
    );
  },
});
