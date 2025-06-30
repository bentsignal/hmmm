import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const isOnWaitlist = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return false;
    }
    const user = await ctx.runQuery(api.users.getUser);
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
    const user = await ctx.runQuery(api.users.getUser);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { waitlist: true });
  },
});
