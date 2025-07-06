"use node";

import { internalAction } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";
import { polar } from "./polar";
import { v } from "convex/values";

export const deleteUserAction = internalAction({
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
