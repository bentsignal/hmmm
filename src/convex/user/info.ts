import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery } from "../convex_helpers";

export const get = authedQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("personalInfo")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user.subject))
      .first();
    if (!doc) {
      return {
        name: undefined,
        location: undefined,
        language: undefined,
        notes: undefined,
      };
    }
    return {
      name: doc.name,
      location: doc.location,
      language: doc.language,
      notes: doc.notes,
    };
  },
});

export const update = authedMutation({
  args: {
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    language: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // validate input
    if (args.name && args.name.length > 100) {
      throw new ConvexError("Name must be less than 100 characters");
    }
    if (args.location && args.location.length > 100) {
      throw new ConvexError("Location must be less than 100 characters");
    }
    if (args.language && args.language.length > 100) {
      throw new ConvexError("Language must be less than 100 characters");
    }
    if (args.notes && args.notes.length > 1000) {
      throw new ConvexError("Notes must be less than 1000 characters");
    }

    const existing = await ctx.db
      .query("personalInfo")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user.subject))
      .first();

    // update or create
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        location: args.location,
        language: args.language,
        notes: args.notes,
      });
    } else {
      await ctx.db.insert("personalInfo", {
        userId: ctx.user.subject,
        name: args.name,
        location: args.location,
        language: args.language,
        notes: args.notes,
      });
    }
  },
});
