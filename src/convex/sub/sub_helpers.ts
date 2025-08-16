import type { LanguageModelUsage } from "ai";
import { QueryCtx } from "@/convex/_generated/server";
import type { LanguageModel } from "@/convex/ai/models";
import { hasUnlimitedAccess } from "@/convex/user/user_helpers";
import { polar } from "./polar";
import {
  ALLOWED_USAGE_PERCENTAGE,
  FREE_TIER_MAX_USAGE,
  HIGHEST_TIER_PUBLIC_PLAN,
} from "./sub_config";
import { usage } from "./usage";
import * as timeHelpers from "@/lib/date-time-utils";

export type Plan = {
  name: "Free" | "Light" | "Premium" | "Ultra" | "Unlimited";
  price: number;
  max: boolean;
};

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

export const getUsageHelper = async (ctx: QueryCtx, userId: string) => {
  const plan = await getUserPlanHelper(ctx, userId);

  // free tier gets set amount per day, paid users get % of their price per month
  const limit =
    plan.price === 0
      ? FREE_TIER_MAX_USAGE
      : plan.price * ALLOWED_USAGE_PERCENTAGE;
  const range = plan.price === 0 ? "daily" : "monthly";

  // first and last day of the current month
  let start, end;
  if (range === "monthly") {
    ({ start, end } = timeHelpers.getMonthBounds());
  } else {
    // start and end of current day
    ({ start, end } = timeHelpers.getDayBounds());
  }

  // get the total usage for the period
  const bounds: {
    lower: { key: number; inclusive: boolean };
    upper: { key: number; inclusive: boolean };
  } = {
    lower: { key: start.getTime(), inclusive: true },
    upper: { key: end.getTime(), inclusive: true },
  };
  const totalUsage: number = await usage.sum(ctx, {
    namespace: userId,
    bounds,
  });

  const unlimited = plan.name === "Unlimited";

  return {
    endOfPeriod: end.toISOString(),
    percentageUsed: Math.min((totalUsage / limit) * 100, 100),
    limitHit: !unlimited && totalUsage >= limit,
    range,
    unlimited,
  };
};

export const calculateModelCost = (
  model: LanguageModel,
  usage: LanguageModelUsage,
) => {
  const million = 1000000;
  const inputCost = model.cost.in * (usage.promptTokens / million);
  const outputCost = model.cost.out * (usage.completionTokens / million);
  const totalCost = inputCost + outputCost + model.cost.other;
  return totalCost;
};
