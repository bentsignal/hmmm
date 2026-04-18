import { v } from "convex/values";

import type { QueryCtx } from "../_generated/server";
import { internalQuery } from "../_generated/server";
import { authedQuery } from "../convex_helpers";
import { polar } from "../polar";
import { hasUnlimitedAccess } from "./account";

// user can use up to 60% of their plan's price on inference
export const ALLOWED_USAGE_PERCENTAGE = 0.6;

// free tier can incur FREE_TIER_MAX_USAGE cost per day
export const FREE_TIER_MAX_USAGE = 0.03;

// ultra is the highest tier a user can purchase, unlimited
// must be manually granted to a user via the convex dashboard
export const HIGHEST_TIER_PUBLIC_PLAN = "Ultra";

export interface Plan {
  name: "Free" | "Light" | "Premium" | "Ultra" | "Unlimited";
  price: number;
  max: boolean;
}

export const enum PlanTier {
  Free = 0,
  Light = 1,
  Premium = 2,
  Ultra = 3,
  Unlimited = 4,
}

// users must be at least Premium tier to choose which model to use
const MODEL_SELECTION_TIER = PlanTier.Premium;

const VALID_PLAN_NAMES = new Set<string>([
  "Free",
  "Light",
  "Premium",
  "Ultra",
  "Unlimited",
]);

function isPlanName(name: string): name is Plan["name"] {
  return VALID_PLAN_NAMES.has(name);
}

function parsePlanName(name: string) {
  if (isPlanName(name)) {
    return name;
  }
  return "Free";
}

export async function getUserPlanHelper(ctx: QueryCtx, userId: string) {
  const [subscription, unlimited] = await Promise.all([
    polar.getCurrentSubscription(ctx, {
      userId,
    }),
    hasUnlimitedAccess(ctx, userId),
  ]);

  if (unlimited) {
    return {
      name: "Unlimited",
      price: 0,
      max: true,
    } satisfies Plan;
  }

  if (!subscription) {
    return {
      name: "Free",
      price: 0,
      max: false,
    } satisfies Plan;
  }

  const planName = parsePlanName(subscription.product.name);
  return {
    name: planName,
    price: subscription.product.prices[0]?.priceAmount ?? 0,
    max: subscription.product.name === HIGHEST_TIER_PUBLIC_PLAN,
  } satisfies Plan;
}

export const getPlan = authedQuery({
  args: {},
  handler: async (ctx) => {
    return await getUserPlanHelper(ctx, ctx.user.subject);
  },
});

export function getPlanTierFromPlan(plan: Plan) {
  switch (plan.name) {
    case "Free":
      return PlanTier.Free;
    case "Light":
      return PlanTier.Light;
    case "Premium":
      return PlanTier.Premium;
    case "Ultra":
      return PlanTier.Ultra;
    case "Unlimited":
      return PlanTier.Unlimited;
    default:
      return PlanTier.Free;
  }
}

export async function getPlanTierHelper(ctx: QueryCtx, userId: string) {
  const plan = await getUserPlanHelper(ctx, userId);
  return getPlanTierFromPlan(plan);
}

export const getPlanTier = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getPlanTierHelper(ctx, args.userId);
  },
});

export function isModelSelectionAllowed(plan: Plan) {
  return getPlanTierFromPlan(plan) >= MODEL_SELECTION_TIER;
}

export const showModelSelector = authedQuery({
  args: {},
  handler: async (ctx) => {
    const plan = await getUserPlanHelper(ctx, ctx.user.subject);
    return isModelSelectionAllowed(plan);
  },
});
