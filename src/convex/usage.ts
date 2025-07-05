import { internalMutation, query } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { TableAggregate } from "@convex-dev/aggregate";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customMutation,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { getUserPlanHelper } from "./polar";

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

export const getUsage = query({
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const plan = await getUserPlanHelper(ctx, userId.subject);
    const limit =
      plan?.price && plan.price > 0 ? plan.price : FREE_TIER_MAX_USAGE;
    const range = plan?.price && plan.price > 0 ? "monthly" : FREE_TIER_RANGE;

    // first and last day of the current month
    const now = new Date();
    const estNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    let start, end;
    if (range === "monthly") {
      start = new Date(estNow.getFullYear(), estNow.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(
        estNow.getFullYear(),
        estNow.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    } else {
      // start and end of current EST day
      start = new Date(
        estNow.getFullYear(),
        estNow.getMonth(),
        estNow.getDate(),
        0,
        0,
        0,
        0,
      );
      end = new Date(
        estNow.getFullYear(),
        estNow.getMonth(),
        estNow.getDate(),
        23,
        59,
        59,
        999,
      );

      // Convert EST times back to UTC for storage/comparison
      const estOffset = now.getTime() - estNow.getTime();
      start = new Date(start.getTime() + estOffset);
      end = new Date(end.getTime() + estOffset);
    }

    // get the total usage for the period
    const totalUsage = await usage.sum(ctx, {
      namespace: userId.subject,
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
  },
});
