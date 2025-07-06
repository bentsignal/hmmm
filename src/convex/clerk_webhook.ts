"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { WebhookEvent } from "@clerk/nextjs/server";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
if (!CLERK_WEBHOOK_SECRET) {
  throw new Error("CLERK_WEBHOOK_SECRET is not set");
}

export const handleClerkWebhook = internalAction({
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
      const wh = new Webhook(CLERK_WEBHOOK_SECRET);
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
      await ctx.runMutation(internal.users.createUser, {
        userId: id,
        email,
      });
    }
  },
});
