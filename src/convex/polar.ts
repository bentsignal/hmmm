import { Polar } from "@convex-dev/polar";
import { components, api, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";

export const getUserIdentity = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    return user;
  },
});

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user = await ctx.runQuery(api.polar.getUserIdentity);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      userId: user.subject,
      email: user.email || "",
    };
  },
});

export const getUserPlan = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("No user found");

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user.subject,
    });

    return subscription?.product.name ?? "Free";
  },
});

export const triggerSync = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.polar.syncProducts);
  },
});

export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});

export const {
  // changeCurrentSubscription,
  // cancelCurrentSubscription,
  // getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
