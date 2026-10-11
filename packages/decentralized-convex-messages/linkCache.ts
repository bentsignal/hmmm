import type { Doc } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import type { LinkCard, LinkPreview } from "./protocol.ts";
import { MAX_LINK_LENGTH, MAX_LINK_PREVIEWS } from "./links.ts";

// The link preview cache and the messages waiting on it. Functions here take
// the database and return what to schedule, so they run in tests without
// Convex; `previews.ts` and `conversations.ts` do the scheduling.

/** How long a fetched preview is reused. */
export const PREVIEW_LIFETIME_MS = 6 * 60 * 60 * 1000;
/** How long a link with no preview is left alone before trying again. */
export const MISSING_LIFETIME_MS = 10 * 60 * 1000;
/**
 * How long a fetch may run before another may start. Comfortably over the
 * fetch's own timeout, so it only matters when a fetch died.
 */
export const FETCH_LIFETIME_MS = 30 * 1000;
/** A message stops waiting for its cards after this; they show the link. */
export const GIVE_UP_AFTER_MS = 20 * 1000;

/** An `expire` job to schedule for a cache entry. */
export interface Expiry {
  readonly at: number;
  readonly url: string;
}

/** IPv4 ranges that aren't the public internet, as [first octets, bits]. */
const PRIVATE_IPV4: readonly (readonly [number, number, number])[] = [
  [0, 0, 8], // "this" network
  [10, 0, 8], // private
  [100, 64, 10], // carrier-grade NAT
  [127, 0, 8], // loopback
  [169, 254, 16], // link-local, including cloud metadata services
  [172, 16, 12], // private
  [192, 168, 16], // private
  [224, 0, 3], // multicast and reserved
];

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !(part >= 0 && part < 256))) {
    return false;
  }
  const address = parts.reduce((value, part) => value * 256 + part, 0);
  return PRIVATE_IPV4.some(([a, b, bits]) => {
    const size = 2 ** (32 - bits);
    const start = a * 2 ** 24 + b * 2 ** 16;
    return address >= start && address < start + size;
  });
}

function isPrivateIpv6(host: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host)?.[1];
  if (mapped !== undefined) return isPrivateIpv4(mapped);
  return (
    host === "::" ||
    host === "::1" ||
    host.startsWith("::ffff:") ||
    /^f[cd]/.test(host) ||
    /^fe[89ab]/.test(host)
  );
}

/**
 * Whether the server may fetch a link: http(s) to a public host. Names on
 * the local network and private, loopback, and link-local addresses are
 * refused, so a link can't make the server reach what's beside it.
 */
export function isPublicWebUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host.includes(":")) return !isPrivateIpv6(host);
  if (/^[\d.]+$/.test(host)) return !isPrivateIpv4(host);
  return (
    host.includes(".") &&
    !/(?:^|\.)(?:localhost|local|internal|lan|home\.arpa)\.?$/.test(host)
  );
}

/** The links a prefetch may ask about: distinct ones, a few at most. */
function askedUrls(urls: readonly string[]) {
  return [...new Set(urls)]
    .filter((url) => url.length <= MAX_LINK_LENGTH)
    .slice(0, MAX_LINK_PREVIEWS);
}

/** The links of `urls` worth fetching. */
export function fetchableUrls(urls: readonly string[]) {
  return askedUrls(urls).filter(isPublicWebUrl);
}

async function cacheEntry(ctx: QueryCtx, url: string) {
  return ctx.db
    .query("linkPreviewCache")
    .withIndex("by_url", (index) => index.eq("url", url))
    .unique();
}

/** The cached entry for a link, unless it has expired. */
async function freshEntry(ctx: QueryCtx, url: string, now: number) {
  const entry = await cacheEntry(ctx, url);
  return entry !== null && entry.expiresAt > now ? entry : null;
}

function cardFor(
  link: string,
  entry: Doc<"linkPreviewCache"> | null,
): LinkCard {
  // A link the server won't fetch shows as just the link.
  if (!isPublicWebUrl(link)) return { link, preview: null };
  return entry?.preview === undefined
    ? { link }
    : { link, preview: entry.preview };
}

/** What the cache knows about each link, for the `linkPreviews` query. */
export async function cachedCards(
  ctx: QueryCtx,
  urls: readonly string[],
  now: number,
): Promise<LinkCard[]> {
  const links = askedUrls(urls);
  const entries = await Promise.all(
    links.map((url) => freshEntry(ctx, url, now)),
  );
  return links.map((link, index) => cardFor(link, entries[index] ?? null));
}

/**
 * Marks each link without a fresh entry as being fetched. Returns the
 * links to fetch (and their entries' expiry jobs); one already being
 * fetched, or fetched recently, isn't fetched again.
 */
export async function claimFetches(
  ctx: MutationCtx,
  urls: readonly string[],
  now: number,
) {
  const claimed: Expiry[] = [];
  for (const url of urls) {
    const entry = await cacheEntry(ctx, url);
    if (entry !== null && entry.expiresAt > now) continue;
    const expiresAt = now + FETCH_LIFETIME_MS;
    if (entry === null) {
      await ctx.db.insert("linkPreviewCache", { expiresAt, url });
    } else {
      await ctx.db.patch(entry._id, { expiresAt, preview: undefined });
    }
    claimed.push({ at: expiresAt, url });
  }
  return claimed;
}

/**
 * The cards a new message starts with: cached previews where there are
 * some, and placeholders for the rest, which wait on fetches (`toFetch`).
 */
export async function cardsForMessage(
  ctx: MutationCtx,
  messageId: string,
  links: readonly string[],
  now: number,
) {
  const cards: LinkCard[] = [];
  const waiting: string[] = [];
  for (const link of links) {
    const card = cardFor(link, await freshEntry(ctx, link, now));
    cards.push(card);
    if (card.preview === undefined) {
      waiting.push(link);
      await ctx.db.insert("linkPreviewWaits", { messageId, url: link });
    }
  }
  return { cards, toFetch: await claimFetches(ctx, waiting, now), waiting };
}

/** The legacy single preview: the first link's, once it has one. */
function firstPreview(cards: readonly LinkCard[]) {
  return cards[0]?.preview ?? undefined;
}

/** Fills in a message's waiting card for `link`. */
async function settleCard(
  ctx: MutationCtx,
  messageId: string,
  link: string,
  preview: LinkPreview | null,
) {
  const message = await ctx.db
    .query("messages")
    .withIndex("by_message", (index) => index.eq("messageId", messageId))
    .unique();
  if (message?.linkPreviews === undefined) return;
  const cards = message.linkPreviews.map((card) =>
    card.link === link && card.preview === undefined ? { link, preview } : card,
  );
  await ctx.db.patch(message._id, {
    linkPreview: firstPreview(cards) ?? message.linkPreview,
    linkPreviews: cards,
  });
}

/**
 * Stores a fetch's result and fills in the cards of every message waiting
 * on it. Returns the entry's expiry job.
 */
export async function storeResult(
  ctx: MutationCtx,
  url: string,
  preview: LinkPreview | null,
  now: number,
) {
  const expiresAt =
    now + (preview === null ? MISSING_LIFETIME_MS : PREVIEW_LIFETIME_MS);
  const entry = await cacheEntry(ctx, url);
  if (entry === null) {
    await ctx.db.insert("linkPreviewCache", { expiresAt, preview, url });
  } else {
    await ctx.db.patch(entry._id, { expiresAt, preview });
  }
  const waits = await ctx.db
    .query("linkPreviewWaits")
    .withIndex("by_url", (index) => index.eq("url", url))
    .collect();
  for (const wait of waits) {
    await settleCard(ctx, wait.messageId, url, preview);
    await ctx.db.delete(wait._id);
  }
  return { at: expiresAt, url } satisfies Expiry;
}

/** Gives a message's cards still waiting a link-only card instead. */
export async function giveUp(ctx: MutationCtx, messageId: string) {
  const waits = await ctx.db
    .query("linkPreviewWaits")
    .withIndex("by_message", (index) => index.eq("messageId", messageId))
    .collect();
  for (const wait of waits) {
    await settleCard(ctx, messageId, wait.url, null);
    await ctx.db.delete(wait._id);
  }
}

/** Deletes a link's cache entry if it has expired (it may have been renewed). */
export async function expire(ctx: MutationCtx, url: string, now: number) {
  const entry = await cacheEntry(ctx, url);
  if (entry !== null && entry.expiresAt <= now) await ctx.db.delete(entry._id);
}
