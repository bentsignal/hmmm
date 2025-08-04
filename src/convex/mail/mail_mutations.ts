import { v } from "convex/values";
import { mutation, MutationCtx } from "../_generated/server";

export const updateNewsletterPreferenceForUser = mutation({
  args: {
    userId: v.string(),
    status: v.boolean(),
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (process.env.NEXT_CONVEX_INTERNAL_KEY === undefined) {
      throw new Error("NEXT_CONVEX_INTERNAL_KEY is not set");
    }
    if (process.env.NEXT_CONVEX_INTERNAL_KEY !== args.key) {
      throw new Error("Invalid key");
    }
    await setPreference(ctx, args.userId, args.status);
    return null;
  },
});

export const updateNewsletterPreference = mutation({
  args: { status: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    await setPreference(ctx, identity.subject, args.status);
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
