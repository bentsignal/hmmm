import { v } from "convex/values";
import { internalQuery, query } from "@/convex/_generated/server";
import { polar } from "./polar";
import { getUsageHelper, getUserPlanHelper } from "./sub_helpers";
import { PlanTier } from "./sub_types";

export const getUserPlan = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No user found");
    return await getUserPlanHelper(ctx, user.subject);
  },
});

export const getPlanTier = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await getUserPlanHelper(ctx, args.userId);
    switch (plan.name) {
      case "Free":
        return PlanTier.Free;
      case "Light":
        return PlanTier.Light;
      case "Premium":
        return PlanTier.Premium;
      case "Ultra":
        return PlanTier.Ultra;
      case "Unlimited":
        return PlanTier.Unlimited;
      default:
        return PlanTier.Free;
    }
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
