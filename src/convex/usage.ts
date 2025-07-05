import { internalMutation, query, QueryCtx } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { TableAggregate } from "@convex-dev/aggregate";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customMutation,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { getUserPlanHelper } from "./polar";

import * as timeHelpers from "./time";

// free tier can incur 1 cent of cost per day
const FREE_TIER_MAX_USAGE = 0.01;
const FREE_TIER_RANGE = "daily";

// aggregate usage per user
const usage = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "messageMetadata";
}>(components.aggregateUsage, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => doc._creationTime,
  sumValue: (doc) => doc.totalCost,
});

// automatically update aggregate table whenever message metadata is updates
const triggers = new Triggers<DataModel>();
triggers.register("messageMetadata", usage.trigger());
export const usageTriggerMutation = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB),
);

export const getCurrentUsage = async (ctx: QueryCtx, userId: string) => {
  const plan = await getUserPlanHelper(ctx, userId);
  const limit =
    plan?.price && plan.price > 0 ? plan.price : FREE_TIER_MAX_USAGE;
  const range = plan?.price && plan.price > 0 ? "monthly" : FREE_TIER_RANGE;

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

  return {
    endOfPeriod: end.toISOString(),
    percentageUsed: Math.min((totalUsage / limit) * 100, 100),
    limitHit: totalUsage >= limit,
    range,
  };
};

export const getUsage = query({
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const usage = await getCurrentUsage(ctx, userId.subject);
    return usage;
  },
});
