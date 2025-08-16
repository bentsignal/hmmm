import { v } from "convex/values";
import { MutationCtx } from "../_generated/server";
import { apiMutation, authedMutation } from "../convex_helpers";

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
