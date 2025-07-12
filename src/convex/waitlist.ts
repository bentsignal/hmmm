import { getUserByUserId } from "@/convex/user/user_helpers";
import { mutation, query } from "./_generated/server";

export const isOnWaitlist = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return false;
    }
    const user = await getUserByUserId(ctx, userId.subject);
    return user?.waitlist === true;
  },
});

export const joinWaitlist = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const user = await getUserByUserId(ctx, userId.subject);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { waitlist: true });
  },
});
