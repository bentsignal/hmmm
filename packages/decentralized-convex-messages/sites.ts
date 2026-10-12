import type { LinkPreview } from "./shapes.ts";

// Sites whose Open Graph tags don't make a good card on their own.

/**
 * Who fetches a preview, and its image in the app. Many sites only serve
 * Open Graph tags to the crawlers they know, and Reddit sends anything
 * else an empty page and a generic image, so this names the same link
 * expanders iMessage's user agent does.
 */
export const LINK_PREVIEW_USER_AGENT =
  "Mozilla/5.0 (compatible; VeraBot/1.0; +https://vera.chat) facebookexternalhit/1.1 Facebot Twitterbot/1.0";

/** The highest bitrate a tweet's video plays at in a card: about 720p. */
const MAX_VIDEO_BITRATE = 2_500_000;

/** The ID of the tweet an x.com or twitter.com link points at. */
export function tweetId(link: string) {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase().replace(/^(?:www|mobile)\./, "");
  if (host !== "x.com" && host !== "twitter.com") return undefined;
  // /<user>/status/<id>, /i/status/<id>, or /i/web/status/<id>
  return /^\/(?:[^/]+|i\/web)\/status(?:es)?\/(\d{1,25})(?:\/|$)/.exec(
    url.pathname,
  )?.[1];
}

/**
 * Where Twitter's embeds read a tweet: public, no sign-in, with its
 * videos. The token is the one its embed code computes from the ID.
 */
export function tweetApiUrl(id: string) {
  const token = ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, "");
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`;
}

/** A field of a JSON object, or undefined. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function stringField(value: unknown, key: string) {
  const found = field(value, key);
  return typeof found === "string" ? found : undefined;
}

function numberField(value: unknown, key: string) {
  const found = field(value, key);
  return typeof found === "number" ? found : undefined;
}

function listField(value: unknown, key: string): readonly unknown[] {
  const found = field(value, key);
  return Array.isArray(found) ? found : [];
}

/**
 * A tweet from the embed API (see `tweetApiUrl`) as a card: its author,
 * its text, and its video or first photo. Null for a deleted or protected
 * tweet, which comes back empty or as a tombstone.
 */
export function tweetPreview(tweet: unknown): LinkPreview | null {
  const id = stringField(tweet, "id_str");
  if (field(tweet, "__typename") !== "Tweet" || id === undefined) return null;
  const user = field(tweet, "user");
  const name = stringField(user, "name");
  const handle = stringField(user, "screen_name");
  return {
    description: tweetText(tweet),
    siteName: "X",
    title: name === undefined ? undefined : `${name} (@${handle ?? ""})`,
    url: `https://x.com/${handle ?? "i"}/status/${id}`,
    ...tweetMedia(listField(tweet, "mediaDetails")),
  };
}

/** A tweet's video with its poster, or else its first photo. */
function tweetMedia(media: readonly unknown[]) {
  const movie = media.find((item) =>
    ["video", "animated_gif"].includes(stringField(item, "type") ?? ""),
  );
  const video = movie === undefined ? undefined : playable(movie);
  const poster = video === undefined ? media[0] : movie;
  return { imageUrl: stringField(poster, "media_url_https"), video };
}

/** The tweet's words, with its links spelled out and its media's dropped. */
function tweetText(tweet: unknown) {
  let shown = stringField(tweet, "text") ?? "";
  const entities = field(tweet, "entities");
  for (const link of listField(entities, "urls")) {
    const url = stringField(link, "url");
    const display = stringField(link, "display_url");
    if (url !== undefined && display !== undefined) {
      shown = shown.replaceAll(url, display);
    }
  }
  for (const media of listField(entities, "media")) {
    shown = shown.replaceAll(stringField(media, "url") ?? "", "");
  }
  const words = decodeEntities(shown).trim();
  return words.length === 0 ? undefined : words;
}

/** The MP4 to play: the best one at or under about 720p. */
function playable(media: unknown): LinkPreview["video"] {
  const info = field(media, "video_info");
  const mp4s = listField(info, "variants")
    .filter((variant) => field(variant, "content_type") === "video/mp4")
    .map((variant) => ({
      bitrate: numberField(variant, "bitrate") ?? 0,
      url: stringField(variant, "url"),
    }))
    .sort((a, b) => b.bitrate - a.bitrate);
  const best =
    mp4s.find(({ bitrate }) => bitrate <= MAX_VIDEO_BITRATE) ?? mp4s.at(-1);
  if (best?.url === undefined) return undefined;
  const size = field(media, "original_info");
  return {
    durationMs: numberField(info, "duration_millis"),
    height: numberField(size, "height"),
    url: best.url,
    width: numberField(size, "width"),
  };
}

function isReddit(url: string) {
  const host = new URL(url).hostname.toLowerCase();
  return host === "reddit.com" || host.endsWith(".reddit.com");
}

/**
 * Reddit's titles read "From the soccer community on Reddit: <post>", often
 * with a zero-width space after the colon.
 */
const REDDIT_TITLE = /^From the (\S+) community on Reddit:[\s\u200B]*(.+)$/su;
/** The description Reddit gives every post. */
const REDDIT_FILLER = /^Explore this post and more from the \S+ community$/u;

/** A Reddit card shows the post, from r/soccer, without the filler. */
export function tidyReddit(preview: LinkPreview): LinkPreview {
  if (!isReddit(preview.url)) return preview;
  const [, community, post] = REDDIT_TITLE.exec(preview.title ?? "") ?? [];
  const tidy = { ...preview };
  if (community !== undefined && post !== undefined) {
    tidy.siteName = `r/${community}`;
    tidy.title = post;
  }
  if (REDDIT_FILLER.test(preview.description ?? "")) {
    tidy.description = undefined;
  }
  return tidy;
}

export function decodeEntities(value: string) {
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
