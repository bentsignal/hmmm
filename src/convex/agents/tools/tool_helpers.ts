import { ToolCtx } from "@convex-dev/agent";
import { internal } from "@/convex/_generated/api";

export const logSearchCost = async (
  ctx: ToolCtx,
  numResults: number,
  userId: string,
) => {
  const baseSearchCost = 0.005; // $5 / 1000 searches
  const contentsCost = numResults * 0.001; // $ 1 / 1000 pages retrieved
  const totalCost = baseSearchCost + contentsCost;
  await ctx.runMutation(internal.sub.usage.logToolCallUsage, {
    userId: userId,
    cost: totalCost,
  });
};
