import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const updateNewsletter = mutation({
  args: {
    email: v.string(),
    status: v.boolean(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    if (process.env.NEXT_CONVEX_INTERNAL_KEY === undefined) {
      throw new Error("NEXT_CONVEX_INTERNAL_KEY is not set");
    }
    if (process.env.NEXT_CONVEX_INTERNAL_KEY !== args.key) {
      throw new Error("Invalid key");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, {
      newsletter: args.status,
    });
  },
});
