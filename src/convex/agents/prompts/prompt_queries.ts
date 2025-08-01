import { query } from "@/convex/_generated/server";

export const getSuggestions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suggestions").order("desc").take(10);
  },
});
