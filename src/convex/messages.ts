import {
  convexCategoryEnum,
  convexDifficultyEnum,
} from "@/features/prompts/types/prompt-types";
import { v } from "convex/values";
import { usageTriggerMutation } from "./usage";

export const insertMessageMetadata = usageTriggerMutation({
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
