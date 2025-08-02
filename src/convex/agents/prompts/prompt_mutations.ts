import { v } from "convex/values";
import { internalMutation, mutation } from "@/convex/_generated/server";
import { counter } from "@/convex/counter";
import { limiter } from "@/convex/limiter";

export const saveNewSuggestions = internalMutation({
  args: {
    prompts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    for (const prompt of args.prompts) {
      await ctx.db.insert("suggestions", { prompt });
    }
  },
});

export const incrementSuggestion = mutation({
  args: {
    id: v.id("suggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // no need to let user know if limit is hit. just don't want to increment
    // the counter if its being spammed malicously
    const { ok } = await limiter.limit(ctx, "suggestion", {
      key: userId.subject,
    });
    if (!ok) {
      return;
    }
    await counter.add(ctx, args.id, 1);
  },
});
