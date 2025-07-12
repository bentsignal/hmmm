import { v } from "convex/values";
import { internalQuery, query } from "@/convex/_generated/server";
import { polar } from "./polar";
import { getUsageHelper, getUserPlanHelper } from "./sub_helpers";

export const getUserPlan = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No user found");
    return await getUserPlanHelper(ctx, user.subject);
  },
});

// plan tier is rated from 0 to 2, with 2 being the highest tier
export const getPlanTier = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await getUserPlanHelper(ctx, args.userId);
    const tier =
      plan?.name === "Ultra" || plan?.name === "Unlimited"
        ? 2
        : plan?.name === "Premium"
          ? 1
          : 0;
    return tier;
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

export const { listAllProducts } = polar.api();
