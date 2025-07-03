import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const clerkWehookHandler = httpAction(async (ctx, request) => {
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing required headers", { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  await ctx.scheduler.runAfter(0, internal.clerk_webhook.handleClerkWebhook, {
    body,
    svixId,
    svixTimestamp,
    svixSignature,
  });
  return new Response("OK", { status: 200 });
});
