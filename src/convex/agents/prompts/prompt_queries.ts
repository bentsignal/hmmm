import { internalQuery, query } from "@/convex/_generated/server";
import { counter } from "@/convex/counter";

export const getSuggestions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suggestions").order("desc").take(10);
  },
});

export const getTopSuggestions = internalQuery({
  handler: async (ctx) => {
    const suggestions = await ctx.db
      .query("suggestions")
      .order("desc")
      .take(30);
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
    return counts.sort((a, b) => b.count - a.count).slice(0, 5);
  },
});
