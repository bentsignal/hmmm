import { ToolCtx } from "@convex-dev/agent";
import { Exa } from "exa-js";
import { internal } from "@/convex/_generated/api";

const EXA_API_KEY = process.env.EXA_API_KEY;
if (!EXA_API_KEY) {
  throw new Error("EXA_API_KEY is not set");
}

export const exa = new Exa(EXA_API_KEY);

export const logSearchCost = async (
  ctx: ToolCtx,
  numResults: number,
  userId: string,
) => {
  const baseSearchCost = 0.005; // $5 / 1000 searches
  const contentsCost = numResults * 0.001; // $ 1 / 1000 pages retrieved
  const totalCost = baseSearchCost + contentsCost;
  await ctx.runMutation(internal.user.usage.logUsage, {
    userId: userId,
    type: "tool_call",
    cost: totalCost,
  });
};

export const formatCacheKey = (toolName: string, args: string[]) => {
  const formattedArgs = args.map((arg) =>
    arg.replace(/[\s,]+/g, "-").toLowerCase(),
  );
  return `tool:${toolName}:${formattedArgs.join("_")}`;
};
