"use node";

import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { v } from "convex/values";
import { polar } from "@/convex/polar";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { env } from "../convex.env";

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
    let event: WebhookEvent;
    try {
      const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (error) {
      console.error("Error verifying webhook:", error);
      throw new Error("Invalid webhook");
    }
    if (event.type === "user.created") {
      const { id } = event.data;
      if (!id) {
        throw new Error("Missing required data");
      }
      const email = event.data.email_addresses[0].email_address;
      if (!email) {
        throw new Error("Missing required data");
      }
      await ctx.runMutation(internal.user.account.create, {
        userId: id,
        email,
      });
    }
  },
});
