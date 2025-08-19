import { v } from "convex/values";
import { internalQuery, MutationCtx } from "../_generated/server";
import { apiMutation, authedMutation, authedQuery } from "../convex_helpers";
import { getUserByUserId } from "../user/account";

export const apiUpdatePreference = apiMutation({
  args: {
    userId: v.string(),
    status: v.boolean(),
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, status } = args;
    await setPreference(ctx, userId, status);
    return null;
  },
});

export const updatePreference = authedMutation({
  args: { status: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { status } = args;
    await setPreference(ctx, ctx.user.subject, status);
    return null;
  },
});

const setPreference = async (
  ctx: MutationCtx,
  userId: string,
  status: boolean,
) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();
  if (!user) {
    throw new Error("User not found");
  }
  await ctx.db.patch(user._id, { newsletter: status });
};

export const getRecipients = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => user.newsletter);
  },
});

export const getUserPreference = authedQuery({
  args: {},
  returns: v.union(v.boolean(), v.null()),
  handler: async (ctx) => {
    const user = await getUserByUserId(ctx, ctx.user.subject);
    if (!user) {
      return null;
    }
    return user.newsletter === true;
  },
});
