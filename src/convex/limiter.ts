import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { MutationCtx, mutation } from "./_generated/server";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  messageSend: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 5 },
  transcription: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },
});

export const messageSendRateLimit = async (
  ctx: MutationCtx,
  userId: string,
) => {
  const { ok } = await rateLimiter.limit(ctx, "messageSend", {
    key: userId,
  });
  if (!ok)
    throw new ConvexError(
      `Sending messages too fast, please wait a few seconds`,
    );
};

export const transcriptionRateLimit = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const { ok } = await rateLimiter.limit(ctx, "transcription", {
      key: userId,
    });
    return ok;
  },
});
