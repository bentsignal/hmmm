import {
  convexCategoryEnum,
  convexDifficultyEnum,
} from "@/features/prompts/types/prompt-types";
import {
  internalMutation as rawInternalMutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { TableAggregate } from "@convex-dev/aggregate";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customMutation,
  customCtx,
} from "convex-helpers/server/customFunctions";

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
const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
);

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // first and last day of the current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // get the total usage for the current month
    const monthlyUsage = await usage.sum(ctx, {
      namespace: userId.subject,
      bounds: {
        lower: { key: firstDay.getTime(), inclusive: true },
        upper: { key: lastDay.getTime(), inclusive: true },
      },
    });

    return {
      start: firstDay.toISOString(),
      end: lastDay.toISOString(),
      total: monthlyUsage,
    };
  },
});

export const insertMessageMetadata = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
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
  },
});
