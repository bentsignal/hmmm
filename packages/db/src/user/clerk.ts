"use node";

import type { WebhookEvent } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { v } from "convex/values";
import { Webhook } from "svix";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { env } from "../convex.env";
import { polar } from "../polar";

function isWebhookEvent(value: unknown): value is WebhookEvent {
  return typeof value === "object" && value !== null && "type" in value;
}

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

export const processWebhook = internalAction({
  args: {
    body: v.string(),
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const { body, svixId, svixTimestamp, svixSignature } = args;
    let verified: unknown;
    try {
      const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
      verified = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (error) {
      console.error("Error verifying webhook:", error);
      throw new Error("Invalid webhook");
    }
    if (!isWebhookEvent(verified)) {
      throw new Error("Invalid webhook payload");
    }
    if (verified.type === "user.created") {
      const { id, email_addresses } = verified.data;
      const firstEmail = email_addresses.at(0);
      if (!id || !firstEmail) {
        throw new Error("Missing required data");
      }
      const email = firstEmail.email_address;
      await ctx.runMutation(internal.user.account.create, {
        userId: id,
        email,
      });
    }
  },
});
