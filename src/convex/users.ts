import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId.subject))
      .unique();
    return user;
  },
});

export const getUserEmail = query({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const user = await ctx.runQuery(internal.users.getUser);
    if (!user) {
      return null;
    }
    return user.email;
  },
});

export const deleteUser = mutation({
  args: {},
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // delete all thread metadata
    const threadMetadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_user_time", (q) => q.eq("userId", userId.subject))
      .collect();
    await Promise.all(
      threadMetadata.map((metadata) => {
        return ctx.db.delete(metadata._id);
      }),
    );

    // delete all threads & corresponding messages from agent
    const { page: threads } = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId.subject,
      },
    );
    await Promise.all(
      threads.map((thread) => {
        return ctx.scheduler.runAfter(
          0,
          components.agent.threads.deleteAllForThreadIdAsync,
          {
            threadId: thread._id,
          },
        );
      }),
    );

    // delete user from clerk
    await ctx.scheduler.runAfter(0, internal.clerk.deleteUserFromClerk, {
      userId: userId.subject,
    });

    // delete user from users table in convex
    const user = await ctx.runQuery(internal.users.getUser);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.delete(user._id);
  },
});
