import { internalAction } from "@/convex/_generated/server";
import { polar } from "../polar";

export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});

export const { generateCheckoutLink, generateCustomerPortalUrl } = polar.api();
