import { Infer, v } from "convex/values";
import { MutationCtx, QueryCtx } from "@/convex/_generated/server";
import {
  convexCategoryEnum,
  convexDifficultyEnum,
} from "@/convex/agents/prompts/types";
import { hasUnlimitedAccess } from "@/convex/user/user_helpers";
import { polar } from "./polar";
import {
  ALLOWED_USAGE_PERCENTAGE,
  FREE_TIER_MAX_USAGE,
  HIGHEST_TIER_PUBLIC_PLAN,
} from "./sub_config";
import { usage } from "./usage";
import * as timeHelpers from "@/lib/date-time-utils";

type Plan = {
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
  const totalUsage = await usage.sum(ctx, {
    namespace: userId,
    bounds: {
      lower: { key: start.getTime(), inclusive: true },
      upper: { key: end.getTime(), inclusive: true },
    },
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

export const usageSchema = v.object({
  messageId: v.string(),
  threadId: v.string(),
  userId: v.string(),
  category: convexCategoryEnum,
  difficulty: convexDifficultyEnum,
  model: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  inputCost: v.number(),
  outputCost: v.number(),
  otherCost: v.number(),
  totalCost: v.number(),
});

export const logUsageHelper = async (
  ctx: MutationCtx,
  args: Infer<typeof usageSchema>,
) => {
  const {
    messageId,
    threadId,
    userId,
    category,
    difficulty,
    model,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    otherCost,
    totalCost,
  } = args;
  await ctx.db.insert("messageMetadata", {
    messageId,
    threadId,
    userId,
    category,
    model,
    difficulty,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    otherCost,
    totalCost,
  });
};
