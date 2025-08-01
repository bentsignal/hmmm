import { v } from "convex/values";
import { internalMutation } from "@/convex/_generated/server";

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
