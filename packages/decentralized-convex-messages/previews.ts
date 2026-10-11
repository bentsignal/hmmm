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
  isPublicWebUrl,
  storeResult,
} from "./linkCache.ts";
import { linkPreview } from "./protocol.ts";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_LENGTH = 512 * 1024;
const MAX_TEXT_LENGTH = 300;

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

async function fetchPreview(url: string): Promise<LinkPreview | null> {
  if (!isPublicWebUrl(url)) return null;
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      // Many sites only serve Open Graph tags to crawlers.
      "User-Agent": "Mozilla/5.0 (compatible; VeraBot/1.0; +https://vera.chat)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const finalUrl = response.url || url;
  // A redirect into the local network gets nothing back from it.
  if (!response.ok || !isPublicWebUrl(finalUrl)) {
    await response.body?.cancel();
    return null;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.startsWith("image/")) {
    return { imageUrl: finalUrl, url: finalUrl };
  }
  if (!contentType.includes("html")) {
    await response.body?.cancel();
    return null;
  }
  return previewFromHtml(await readHtml(response), finalUrl);
}

/** The start of a page, reading no more than `MAX_HTML_LENGTH` of it. */
async function readHtml(response: Response) {
  const reader: ReadableStreamDefaultReader<Uint8Array> | undefined =
    response.body?.getReader();
  if (reader === undefined) return "";
  const decoder = new TextDecoder();
  let html = "";
  while (html.length < MAX_HTML_LENGTH) {
    const chunk: { done: boolean; value?: Uint8Array } = await reader.read();
    if (chunk.done || chunk.value === undefined) break;
    html += decoder.decode(chunk.value, { stream: true });
  }
  await reader.cancel();
  return html.slice(0, MAX_HTML_LENGTH);
}

function previewFromHtml(html: string, url: string): LinkPreview | null {
  const title =
    firstMeta(html, ["og:title", "twitter:title"]) ?? titleTag(html);
  const description = firstMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const image = firstMeta(html, ["og:image", "twitter:image"]);
  const preview: LinkPreview = {
    description: clean(description),
    imageUrl: image === undefined ? undefined : absoluteHttps(image, url),
    siteName: clean(firstMeta(html, ["og:site_name"])) ?? new URL(url).hostname,
    title: clean(title),
    url,
  };
  return preview.title === undefined && preview.imageUrl === undefined
    ? null
    : preview;
}

function firstMeta(html: string, names: readonly string[]) {
  for (const name of names) {
    const content = metaContent(html, name);
    if (content !== undefined) return content;
  }
  return undefined;
}

function metaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (key === undefined || !new RegExp(`^${escaped}$`, "i").test(key)) {
      continue;
    }
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content !== undefined) return decodeEntities(content);
  }
  return undefined;
}

function titleTag(html: string) {
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  return title === undefined ? undefined : decodeEntities(title);
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function clean(value: string | undefined) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text === undefined || text.length === 0
    ? undefined
    : text.slice(0, MAX_TEXT_LENGTH);
}

/** Resolves relative image URLs and drops anything not served over https. */
function absoluteHttps(value: string, base: string) {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
