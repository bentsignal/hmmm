import { TableAggregate } from "@convex-dev/aggregate";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { v } from "convex/values";
import { components } from "@/convex/_generated/api";
import { DataModel } from "@/convex/_generated/dataModel";
import { internalMutation, mutation } from "@/convex/_generated/server";
import {
  convexCategoryEnum,
  convexDifficultyEnum,
} from "../agents/prompts/types";
import { getUsageHelper } from "./sub_helpers";

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

export const logMessageUsage = usageTriggerInternalMutation({
  args: v.object({
    messageId: v.string(),
    threadId: v.string(),
    userId: v.string(),
    category: convexCategoryEnum,
    difficulty: convexDifficultyEnum,
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
  }),
  handler: async (ctx, args) => {
    const usageId = await ctx.db.insert("usage", {
      userId: args.userId,
      cost: args.cost,
      type: "message",
    });
    await ctx.db.insert("messageMetadata", {
      messageId: args.messageId,
      threadId: args.threadId,
      userId: args.userId,
      usageId: usageId,
      category: args.category,
      difficulty: args.difficulty,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
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
