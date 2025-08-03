import { v } from "convex/values";
import { internalQuery, query } from "@/convex/_generated/server";
import { counter } from "@/convex/counter";

export const getSuggestions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suggestions").order("desc").take(10);
  },
});

export const getTodaysSuggestions = internalQuery({
  args: {
    numResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // get all suggestions generated today
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const suggestions = await ctx.db
      .query("suggestions")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", startOfDay))
      .order("desc")
      .collect();
    // count how many times each suggestion has been clicked
    const counts = await Promise.all(
      suggestions.map(async (suggestion) => {
        const count = await counter.count(ctx, suggestion._id);
        return {
          id: suggestion._id,
          prompt: suggestion.prompt,
          count,
        };
      }),
    );
    // sort by count and return the top clicked results
    return counts
      .sort((a, b) => b.count - a.count)
      .slice(0, args.numResults ?? counts.length);
  },
});
