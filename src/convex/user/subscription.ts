import { v } from "convex/values";
import { internalQuery, QueryCtx } from "@/convex/_generated/server";
import { hasUnlimitedAccess } from "@/convex/user/account";
import { authedQuery } from "../convex_helpers";
import { polar } from "../polar";

// user can use up to 60% of their plan's price on inference
export const ALLOWED_USAGE_PERCENTAGE = 0.6;

// free tier can incur FREE_TIER_MAX_USAGE cost per day
export const FREE_TIER_MAX_USAGE = 0.03;

// ultra is the highest tier a user can purchase, unlimited
// must be manually granted to a user
export const HIGHEST_TIER_PUBLIC_PLAN = "Ultra";

export type Plan = {
  name: "Free" | "Light" | "Premium" | "Ultra" | "Unlimited";
  price: number;
  max: boolean;
};

export const enum PlanTier {
  Free = 0,
  Light = 1,
  Premium = 2,
  Ultra = 3,
  Unlimited = 4,
}

export const getUserPlanHelper = async (
  ctx: QueryCtx,
  userId: string,
): Promise<Plan> => {
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
    };
  }

  if (!subscription) {
    return {
      name: "Free",
      price: 0,
      max: false,
    };
  }

  return {
    name: subscription.product.name as Plan["name"],
    price: subscription.product.prices[0]?.priceAmount ?? 0,
    max: subscription.product.name === HIGHEST_TIER_PUBLIC_PLAN,
  };
};

export const getPlan = authedQuery({
  args: {},
  handler: async (ctx) => {
    return await getUserPlanHelper(ctx, ctx.user.subject);
  },
});

export const getPlanTier = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await getUserPlanHelper(ctx, args.userId);
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
  },
});
