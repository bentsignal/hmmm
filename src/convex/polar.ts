import { Polar } from "@convex-dev/polar";
import { components, internal } from "@/convex/_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user = await ctx.runQuery(internal.polar.getUserIdentity);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      userId: user.subject,
      email: user.email || "",
    };
  },
});

export const getUserIdentity = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    return user;
  },
});

export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});

export const {
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
