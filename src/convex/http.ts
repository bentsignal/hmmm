import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { polar } from "./polar";
import { resend } from "./resend";

const http = httpRouter();

polar.registerRoutes(http);

http.route({
  path: "/clerk/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing required headers", { status: 400 });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);

    await ctx.scheduler.runAfter(0, internal.user.clerk.processWebhook, {
      body,
      svixId,
      svixTimestamp,
      svixSignature,
    });
    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
