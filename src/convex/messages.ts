import { Infer, v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { getUsageHelper } from "./sub/sub_helpers";
import {
  usageTriggerInternalMutation,
  usageTriggerMutation,
} from "./sub/usage";
import {
  convexCategoryEnum,
  convexDifficultyEnum,
} from "@/features/prompts/types/prompt-types";

const params = v.object({
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

export const insertMessageMetadata = usageTriggerInternalMutation({
  args: params,
  handler: async (ctx, args) => {
    await insertMetadata(ctx, args);
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
    await insertMetadata(ctx, {
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

const insertMetadata = async (ctx: MutationCtx, args: Infer<typeof params>) => {
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
