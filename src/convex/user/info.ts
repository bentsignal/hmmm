import { CustomCtx } from "convex-helpers/server/customFunctions";
import { ConvexError, v } from "convex/values";
import { getPublicLanguageModels } from "../ai/models";
import { authedMutation, authedQuery } from "../convex_helpers";
import { allowModelSelection } from "./subscription";

export const getUserInfoHelper = async (
  ctx: CustomCtx<typeof authedQuery> | CustomCtx<typeof authedMutation>,
) => {
  const doc = await ctx.db
    .query("personalInfo")
    .withIndex("by_user_id", (q) => q.eq("userId", ctx.user.subject))
    .first();
  return doc;
};

export const get = authedQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("personalInfo")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user.subject))
      .first();
    if (!doc) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, userId, ...publicDoc } = doc;
    return publicDoc;
  },
});

export const update = authedMutation({
  args: {
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    language: v.optional(v.string()),
    notes: v.optional(v.string()),
    model: v.optional(v.string()),
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
    if (args.model) {
      const publicModels = getPublicLanguageModels();
      if (!publicModels[args.model]) {
        throw new ConvexError("Invalid model");
      }
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
        model: args.model,
      });
    } else {
      await ctx.db.insert("personalInfo", {
        userId: ctx.user.subject,
        name: args.name,
        location: args.location,
        language: args.language,
        notes: args.notes,
        model: args.model,
      });
    }
  },
});

export const getPerferredModelIfAllowed = async (
  ctx: CustomCtx<typeof authedMutation>,
  modelId?: string,
) => {
  if (!modelId) {
    return undefined;
  }
  const allowed = await allowModelSelection(ctx, ctx.user.subject);
  if (!allowed) {
    return undefined;
  }
  const publicModels = getPublicLanguageModels();
  const publicModelIds = Object.keys(publicModels);
  if (publicModelIds.includes(modelId)) {
    return modelId;
  }
  return undefined;
};
