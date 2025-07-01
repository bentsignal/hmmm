"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";

export const deleteUserFromClerk = internalAction({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  },
});
