import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { mutation, MutationCtx } from "./_generated/server";

export const limiter = new RateLimiter(components.rateLimiter, {
  messageSend: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 5 },
  transcription: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },
  suggestion: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },
  upload: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 3,
  },
});

export const messageSendRateLimit = async (
  ctx: MutationCtx,
  userId: string,
) => {
  const { ok } = await limiter.limit(ctx, "messageSend", {
    key: userId,
  });
  if (!ok)
    throw new ConvexError(
      `Sending messages too fast, please wait a few seconds`,
    );
};

export const transcriptionRateLimit = mutation({
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { ok } = await limiter.limit(ctx, "transcription", {
      key: userId.subject,
    });
    return ok;
  },
});
