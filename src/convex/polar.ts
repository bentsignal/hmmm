import { Polar } from "@convex-dev/polar";
import { components, api, internal } from "./_generated/api";
import {
  internalAction,
  mutation,
  query,
  QueryCtx,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";

// highest tier plan
const MAX_PLAN_NAME = "Ultra";

export const getUserIdentity = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    return user;
  },
});

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user = await ctx.runQuery(api.polar.getUserIdentity);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      userId: user.subject,
      email: user.email || "",
    };
  },
});

export const getUserPlan = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No user found");
    return await getUserPlanHelper(ctx, user.subject);
  },
});

// plan tier is rated from 0 to 2, with 2 being the highest tier
export const getPlanTier = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await getUserPlanHelper(ctx, args.userId);
    const tier =
      plan?.name === "Light"
        ? 0
        : plan?.name === "Premium"
          ? 1
          : plan?.name === "Ultra"
            ? 2
            : 0;
    return tier;
  },
});

export const getUserPlanHelper = async (ctx: QueryCtx, userId: string) => {
  const subscription = await polar.getCurrentSubscription(ctx, {
    userId,
  });
  if (!subscription) {
    return null;
  }
  return {
    name: subscription.product.name,
    price: subscription.product.prices[0]?.priceAmount ?? 0,
    max: subscription.product.name === MAX_PLAN_NAME,
  };
};

export const triggerSync = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.polar.syncProducts);
  },
});

export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});

export const {
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
