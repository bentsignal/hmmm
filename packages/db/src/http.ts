import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { polar } from "./polar";
import { resend } from "./resend";

const http = httpRouter();

polar.registerRoutes(http);

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
