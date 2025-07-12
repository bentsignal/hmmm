import { QueryCtx } from "@/convex/_generated/server";

/**
 * User's with access have unlimited usage at the highest tier
 */
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

export const getUserByUserId = async (ctx: QueryCtx, userId: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
  return user;
};
