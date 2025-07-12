import { httpRouter } from "convex/server";
import { webhookHandler } from "./clerk/clerk_http_actions";
import { polar } from "./sub/polar";

const http = httpRouter();

polar.registerRoutes(http);

http.route({
  path: "/clerk/events",
  method: "POST",
  handler: webhookHandler,
});

export default http;
