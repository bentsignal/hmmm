import { Infer, v } from "convex/values";
import { MutationCtx, QueryCtx } from "@/convex/_generated/server";
import {
  convexCategoryEnum,
  convexDifficultyEnum,
} from "@/convex/agents/prompts/types";
import { hasAccess } from "@/convex/user/user_helpers";
import { polar } from "./polar";
import { usage } from "./usage";
import * as timeHelpers from "@/lib/date-time-utils";

// user can use up to 75% of their plan's price. Hopefully
// can be increased in the future, just need to see how all
// of the other recurring costs stack up
export const ALLOWED_USAGE_PERCENTAGE = 0.75;

// free tier can incur 1 cent of cost per day
export const FREE_TIER_MAX_USAGE = 0.01;

// ultra is the highest tier a user can purchase, unlimited
// must be manually granted to a user
const HIGHEST_TIER_PUBLIC_PLAN = "Ultra";

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

  // if a user document has "access" set to true, then they get
  // unlimited usage on the highest tier plan
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
    max: subscription.product.name === HIGHEST_TIER_PUBLIC_PLAN,
  };
};

export const getUsageHelper = async (ctx: QueryCtx, userId: string) => {
  const plan = await getUserPlanHelper(ctx, userId);
  const limit =
    plan?.price && plan.price > 0
      ? plan.price * ALLOWED_USAGE_PERCENTAGE
      : FREE_TIER_MAX_USAGE;
  const range = plan?.price && plan.price > 0 ? "monthly" : "daily";

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

  const unlimited = plan?.name === "Unlimited";

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
