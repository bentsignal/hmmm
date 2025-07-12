import { internal } from "@/convex/_generated/api";
import { mutation } from "@/convex/_generated/server";

export const triggerSync = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.sub.sub_actions.syncProducts);
  },
});
