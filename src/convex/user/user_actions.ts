"use node";

import { clerkClient } from "@clerk/nextjs/server";
import { v } from "convex/values";
import { internalAction } from "@/convex/_generated/server";
import { polar } from "@/convex/polar";

export const deleteUser = internalAction({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // delete customer
    const customer = await polar.getCustomerByUserId(ctx, userId);
    if (!customer) {
      throw new Error("No customer found");
    }
    await polar.sdk.customers.delete({ id: customer.id });

    // delete user from clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  },
});
