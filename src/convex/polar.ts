import { Polar } from "@convex-dev/polar";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import {
  internalAction,
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { hasAccess } from "./users";

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
      plan?.name === "Ultra" || plan?.name === "Unlimited"
        ? 2
        : plan?.name === "Premium"
          ? 1
          : 0;
    return tier;
  },
});

type Plan = {
  name: "Light" | "Premium" | "Ultra" | "Unlimited";
  price: number;
  max: boolean;
};

export const getUserPlanHelper = async (
  ctx: QueryCtx,
  userId: string,
): Promise<Plan | null> => {
  const [subscription, access] = await Promise.all([
    polar.getCurrentSubscription(ctx, {
      userId,
    }),
    hasAccess(ctx, userId),
  ]);
  if (access) {
    return {
      name: "Unlimited",
      price: 0,
      max: true,
    };
  }
  if (!subscription) {
    return null;
  }
  return {
    name: subscription.product.name as Plan["name"],
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
