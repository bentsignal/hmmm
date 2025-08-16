import { TableAggregate } from "@convex-dev/aggregate";
import { LanguageModelUsage } from "ai";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { v } from "convex/values";
import { components } from "@/convex/_generated/api";
import { DataModel } from "@/convex/_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  QueryCtx,
} from "@/convex/_generated/server";
import { LanguageModel } from "../ai/models";
import {
  ALLOWED_USAGE_PERCENTAGE,
  FREE_TIER_MAX_USAGE,
  getUserPlanHelper,
} from "../user/subscription";
import * as timeHelpers from "@/lib/date-time-utils";

// aggregate usage per user
export const usage = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "usage";
}>(components.aggregateUsage, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => doc._creationTime,
  sumValue: (doc) => doc.cost,
});

// automatically update aggregate table whenever usage is logged
const triggers = new Triggers<DataModel>();
triggers.register("usage", usage.trigger());

// use these mutation types when logging usage, otherwise
// the aggregate won't be updated. Don't use them for
// deleting messages though, since we don't want to erase the
// usage incurred by messages, even if they're deleted
const usageTriggerInternalMutation = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB),
);
const usageTriggerMutation = customMutation(
  mutation,
  customCtx(triggers.wrapDB),
);

export const logUsage = usageTriggerInternalMutation({
  args: v.object({
    cost: v.number(),
    userId: v.string(),
    type: v.union(v.literal("message"), v.literal("tool_call")),
  }),
  handler: async (ctx, args) => {
    await ctx.db.insert("usage", {
      userId: args.userId,
      cost: args.cost,
      type: args.type,
    });
  },
});

export const logTranscriptionUsage = usageTriggerMutation({
  args: v.object({
    cost: v.number(),
    totalCost: v.number(),
    model: v.string(),
    key: v.string(),
  }),
  handler: async (ctx, args) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const INTERNAL_KEY = process.env.NEXT_CONVEX_INTERNAL_KEY;
    if (!INTERNAL_KEY || INTERNAL_KEY !== args.key) {
      throw new Error("Unauthorized");
    }
    // usage check
    const usage = await getUsageHelper(ctx, userId.subject);
    if (usage.limitHit) {
      throw new Error("User has reached usage limit");
    }
    await ctx.db.insert("usage", {
      userId: userId.subject,
      cost: args.cost,
      type: "transcription",
    });
  },
});

export const getUsage = query({
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const usage = await getUsageHelper(ctx, userId.subject);
    return usage;
  },
});

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
