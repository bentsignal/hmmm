import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ConvexError, v } from "convex/values";
import {
  ActionCtx,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";

export const checkApiKey = (apiKey: string) => {
  if (!process.env.NEXT_CONVEX_INTERNAL_KEY) {
    throw new ConvexError("Internal key not set");
  }
  if (apiKey !== process.env.NEXT_CONVEX_INTERNAL_KEY) {
    throw new ConvexError("Invalid key");
  }
};

export const checkAuth = async (ctx: QueryCtx | MutationCtx | ActionCtx) => {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  return user;
};

export const apiMutation = customMutation(mutation, {
  args: {
    apiKey: v.string(),
  },
  input: async (ctx, args) => {
    const { apiKey } = args;
    checkApiKey(apiKey);
    return { ctx, args: {} };
  },
});

export const apiQuery = customQuery(query, {
  args: {
    apiKey: v.string(),
  },
  input: async (ctx, args) => {
    const { apiKey } = args;
    checkApiKey(apiKey);
    return { ctx, args: {} };
  },
});

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await checkAuth(ctx);
    return { user };
  }),
);

export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const user = await checkAuth(ctx);
    return { user };
  }),
);
