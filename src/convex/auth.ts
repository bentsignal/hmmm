import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { agent } from "./agent";
import { v } from "convex/values";

const ACCESS_CODE = process.env.ACCESS_CODE;
if (!ACCESS_CODE) {
  throw new Error("ACCESS_CODE is not set");
}

export const externalSubCheck = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();
    if (!user) {
      return false;
    }
    return user.access === true;
  },
});

export const isUserSubscribed = query({
  args: {},
  handler: async (ctx): Promise<boolean | null> => {
    const user = await ctx.runQuery(internal.users.getUser);
    if (!user) {
      return null;
    }
    return user.access === true;
  },
});

export const requestAccess = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const { code } = args;
    const user = await ctx.runQuery(internal.users.getUser);
    if (!user) {
      throw new Error("Unauthorized");
    }
    if (user.access === true) {
      throw new Error("User already has access");
    }
    if (code.toLowerCase() !== ACCESS_CODE.toLowerCase()) {
      throw new Error("Invalid code");
    }
    await ctx.db.patch(user._id, { access: true });
  },
});

export const authorizeThreadAccess = async (
  ctx: QueryCtx | MutationCtx,
  threadId: string,
) => {
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });
  if (!thread) {
    return false;
  }
  const metadata = await agent.getThreadMetadata(ctx, {
    threadId,
  });
  if (metadata.userId !== userId.subject) {
    throw new Error("Unauthorized");
  }
  return metadata.userId;
};
