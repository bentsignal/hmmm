import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { webhookHandler } from "./clerk/clerk_http_actions";
import { resend } from "./resend";
import { polar } from "./sub/polar";

const http = httpRouter();

polar.registerRoutes(http);

http.route({
  path: "/clerk/events",
  method: "POST",
  handler: webhookHandler,
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
