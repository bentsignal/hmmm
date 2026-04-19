import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
import { authedQuery } from "../../convex_helpers";
import { authorizeAccess, getMetadata } from "./helpers";

/**
 * Thread state is derived from the latest row in `threadEvents` for the
 * thread. Steady-state idle = 0 rows for the thread. `user_message_sent` is
 * the only event that maps to `waiting`; `agent_working` and
 * `response_streaming` both map to `streaming`.
 */
export async function getStateForThread(
  ctx: QueryCtx,
  threadId: Id<"threads">,
) {
  const event = await ctx.db
    .query("threadEvents")
    .withIndex("threadId_timestamp", (q) => q.eq("threadId", threadId))
    .order("desc")
    .first();
  if (!event) return "idle" as const;
  if (event.eventType === "user_message_sent") return "waiting" as const;
  return "streaming" as const;
}

export const get = authedQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const { threadId } = args;
    if (threadId.trim().length === 0) return "idle" as const;
    const thread = await authorizeAccess(ctx, threadId);
    if (!thread) return undefined;
    return getStateForThread(ctx, thread._id);
  },
});

/**
 * "Did the user abort this generation?" — true iff the generation's events
 * have been cleared (abort path calls `clearEventsForGeneration`). Safe to
 * call after natural completion too: completion also clears events, but the
 * caller decides what to do with the answer in each code path.
 */
export const wasAborted = internalQuery({
  args: { threadId: v.string(), generationId: v.string() },
  handler: async (ctx, args) => {
    const thread = await getMetadata(ctx, args.threadId);
    if (!thread) return true;
    const event = await ctx.db
      .query("threadEvents")
      .withIndex("generationId", (q) => q.eq("generationId", args.generationId))
      .first();
    return event === null;
  },
});

/**
 * One-off cleanup for pre-2c rows that still carry the legacy `state` field.
 * After 2c the field is dead code on the write path; this migration clears
 * it so a future PR can drop `state` from the schema cleanly. Run via
 * `npx convex run ai/thread/state:clearLegacyState`.
 */
export const clearLegacyState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query("threads").collect();
    let cleared = 0;
    for (const t of threads) {
      if (t.state !== undefined) {
        await ctx.db.patch(t._id, { state: undefined });
        cleared++;
      }
    }
    return { scanned: threads.length, cleared };
  },
});
