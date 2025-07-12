import { v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import { internalMutation, mutation } from "@/convex/_generated/server";
import { getUserByUserId } from "./user_helpers";

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
    });
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
    await ctx.scheduler.runAfter(0, internal.user.user_actions.deleteUser, {
      userId: userId.subject,
    });
  },
});
