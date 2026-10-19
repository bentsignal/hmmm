import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

// How fast one person can use Vera's assistants: 100 replies an hour across
// Support and Vera, on a rolling basis. A token bucket per person holds up
// to 100 replies and refills one every 36 seconds. (Convex's rate limiter
// Component can't be installed here: it installs a Component of its own,
// which breaks importing convex.config.ts outside Convex, as http.ts and
// pds.ts do.)

export const REPLIES_PER_HOUR = 100;
const HOUR = 60 * 60 * 1000;
const REFILL = HOUR / REPLIES_PER_HOUR;

function bucketOf(ctx: Pick<QueryCtx, "db">, accountId: string) {
  return ctx.db
    .query("rateLimits")
    .withIndex("by_account", (q) => q.eq("accountId", accountId))
    .unique();
}

/** Replies left now, from what was left at `updatedAt`. */
export function refilled(tokens: number, updatedAt: number, now: number) {
  return Math.min(REPLIES_PER_HOUR, tokens + (now - updatedAt) / REFILL);
}

/**
 * Takes one reply from the person's bucket: `{ ok: true }`, or how many
 * milliseconds until they have one again.
 */
export async function takeReply(ctx: MutationCtx, accountId: string) {
  const now = Date.now();
  const bucket = await bucketOf(ctx, accountId);
  const tokens =
    bucket === null
      ? REPLIES_PER_HOUR
      : refilled(bucket.tokens, bucket.updatedAt, now);
  if (tokens < 1) {
    return { ok: false as const, retryAfter: Math.ceil((1 - tokens) * REFILL) };
  }
  const next = { accountId, tokens: tokens - 1, updatedAt: now };
  if (bucket === null) await ctx.db.insert("rateLimits", next);
  else await ctx.db.replace(bucket._id, next);
  return { ok: true as const };
}

/** How the limit notice starts, so the model can tell it didn't write it. */
export const LIMIT_NOTICE_START = "You've hit the limit of";

/** What an assistant says, without the model, when someone hits the limit. */
export function limitNotice(retryAfter: number) {
  const minutes = Math.ceil(retryAfter / 60_000);
  const when =
    minutes <= 1 ? "in a minute" : `in about ${String(minutes)} minutes`;
  return `${LIMIT_NOTICE_START} ${String(REPLIES_PER_HOUR)} messages an hour with Vera's assistants. Try again ${when}.`;
}

/**
 * Operator command:
 * `npx convex run rateLimits:status '{"accountId":"someone@vera.chat"}'`.
 */
export const status = internalQuery({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const bucket = await bucketOf(ctx, accountId);
    const left =
      bucket === null
        ? REPLIES_PER_HOUR
        : refilled(bucket.tokens, bucket.updatedAt, Date.now());
    return { repliesLeft: Math.floor(left) };
  },
});

/**
 * Operator command:
 * `npx convex run rateLimits:reset '{"accountId":"someone@vera.chat"}'`.
 * Gives someone their full hour back.
 */
export const reset = internalMutation({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const bucket = await bucketOf(ctx, accountId);
    if (bucket !== null) await ctx.db.delete(bucket._id);
  },
});
