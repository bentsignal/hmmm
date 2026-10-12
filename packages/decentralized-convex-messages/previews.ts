import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server.js";
import type { Expiry } from "./linkCache.ts";
import type { LinkPreview } from "./protocol.ts";
import { internal } from "./_generated/api.js";
import { internalAction, internalMutation } from "./_generated/server.js";
import {
  claimFetches,
  expire as expireEntry,
  fetchableUrls,
  giveUp as giveUpWaits,
  storeResult,
} from "./linkCache.ts";
import { fetchPreview } from "./opengraph.ts";
import { linkPreview } from "./protocol.ts";

/** Schedules the deletion of cache entries once they expire. */
export async function scheduleExpiries(
  ctx: MutationCtx,
  expiries: readonly Expiry[],
) {
  for (const { at, url } of expiries) {
    await ctx.scheduler.runAt(at, internal.previews.expire, { url });
  }
}

/** Fetches each claimed link (see `claimFetches`) in the background. */
export async function startFetches(
  ctx: MutationCtx,
  claimed: readonly Expiry[],
) {
  for (const { url } of claimed) {
    await ctx.scheduler.runAfter(0, internal.previews.fetchLink, { url });
  }
  await scheduleExpiries(ctx, claimed);
}

/** Starts fetching links someone is typing, unless they're cached. */
export async function prefetch(ctx: MutationCtx, urls: readonly string[]) {
  await startFetches(
    ctx,
    await claimFetches(ctx, fetchableUrls(urls), Date.now()),
  );
}

export const store = internalMutation({
  args: { preview: v.union(v.null(), linkPreview), url: v.string() },
  handler: async (ctx, { preview, url }) => {
    const expiry = await storeResult(ctx, url, preview, Date.now());
    await scheduleExpiries(ctx, [expiry]);
  },
});

export const expire = internalMutation({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    await expireEntry(ctx, url, Date.now());
  },
});

/** A message's cards still waiting show just their links. */
export const giveUp = internalMutation({
  args: { messageId: v.string() },
  handler: async (ctx, { messageId }) => {
    await giveUpWaits(ctx, messageId);
  },
});

/** Fetches a link's Open Graph preview into the cache. */
export const fetchLink = internalAction({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    let preview: LinkPreview | null = null;
    try {
      preview = await fetchPreview(url);
    } catch (error) {
      console.warn("Link preview failed", url, error);
    }
    await ctx.runMutation(internal.previews.store, { preview, url });
  },
});
