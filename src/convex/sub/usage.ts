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
import { getUsageHelper, logUsageHelper, usageSchema } from "./sub_helpers";

// aggregate usage per user
export const usage = new TableAggregate<{
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

// use these mutation types when sending new messages, otherwise
// the ussage aggregate won't be updated. Don't use them for
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

export const insertMessageMetadata = usageTriggerInternalMutation({
  args: usageSchema,
  handler: async (ctx, args) => {
    await logUsageHelper(ctx, args);
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
    // insert metadata
    await logUsageHelper(ctx, {
      messageId: "",
      threadId: "",
      userId: userId.subject,
      category: "general",
      difficulty: "easy",
      model: args.model,
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      otherCost: args.cost,
      totalCost: args.totalCost,
    });
  },
});
