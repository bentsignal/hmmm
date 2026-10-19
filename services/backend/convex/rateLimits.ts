import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { current, decide, STRIKES_PER_DAY } from "../assistant-limits";
import { internalMutation, internalQuery } from "./_generated/server";

// How fast one person can use Vera's assistants (Support and Vera together):
//
// - 300 replies an hour, on a rolling basis: a token bucket per person that
//   holds up to 300 replies and refills one every 12 seconds.
// - Each separate time they run the hour's allowance dry is a strike. Five
//   strikes within a day (a fixed window from the first) pause the
//   assistants for them until that day is up, so someone can't sit at the
//   limit sending a message every refill.
//
// Over a limit, the assistant says so once, without the model. (Convex's
// rate limiter Component can't be installed here: it installs a Component of
// its own, which breaks importing convex.config.ts outside Convex, as
// http.ts and pds.ts do.)

function bucketOf(ctx: Pick<QueryCtx, "db">, accountId: string) {
  return ctx.db
    .query("rateLimits")
    .withIndex("by_account", (q) => q.eq("accountId", accountId))
    .unique();
}

/**
 * Takes one reply from the person's allowance: `{ ok: true }`, or a refusal
 * with the notice to send (null when they've already been told).
 */
export async function takeReply(ctx: MutationCtx, accountId: string) {
  const now = Date.now();
  const stored = await bucketOf(ctx, accountId);
  const bucket = current(stored, accountId, now);
  const result = decide(bucket, now);
  if (stored === null) await ctx.db.insert("rateLimits", result.bucket);
  else await ctx.db.replace(stored._id, result.bucket);
  return result.ok
    ? { ok: true as const }
    : { notice: result.notice, ok: false as const };
}

/**
 * Operator command:
 * `npx convex run rateLimits:status '{"accountId":"someone@vera.chat"}'`.
 */
export const status = internalQuery({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const bucket = current(
      await bucketOf(ctx, accountId),
      accountId,
      Date.now(),
    );
    return {
      paused: (bucket.strikes ?? 0) >= STRIKES_PER_DAY,
      repliesLeft: Math.floor(bucket.tokens),
      strikesToday: bucket.strikes ?? 0,
    };
  },
});

/**
 * Operator command:
 * `npx convex run rateLimits:reset '{"accountId":"someone@vera.chat"}'`.
 * Gives someone their full hour back and clears today's strikes.
 */
export const reset = internalMutation({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const bucket = await bucketOf(ctx, accountId);
    if (bucket !== null) await ctx.db.delete(bucket._id);
  },
});
