import { httpRouter } from "convex/server";
import { polar } from "./polar";
import { clerkWehookHandler } from "./clerk";

const http = httpRouter();

polar.registerRoutes(http);

http.route({
  path: "/clerk/events",
  method: "POST",
  handler: clerkWehookHandler,
});

export default http;
