import { QueryCtx } from "@/convex/_generated/server";

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
