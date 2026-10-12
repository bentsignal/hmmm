/**
 * Endings a bare domain ("maptap.gg") counts as a link with. Without a
 * protocol or "www." a link needs one of these, so "e.g." and "node.js"
 * stay text.
 */
const BARE_DOMAIN_ENDINGS =
  "com|org|net|edu|gov|io|co|gg|app|dev|me|tv|us|uk|ca|ai|xyz|ly|fm|so|to|chat|news|info|link|live|blog|page|site|store|shop";

/**
 * A link: with its protocol, from "www.", or a bare domain with a common
 * ending. Never inside a word or an email address.
 */
const URL_PATTERN = new RegExp(
  `(?<![\\w@./-])(?:https?://[^\\s<>"']+|www\\.[^\\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${BARE_DOMAIN_ENDINGS})(?![\\w-])(?:[/?#][^\\s<>"']*)?)`,
  "gi",
);
const TRAILING_PUNCTUATION = /[).,!?:;'"]+$/;

/** At most this many links in a message get a preview card each. */
export const MAX_LINK_PREVIEWS = 4;
/** Longer links are left as text. */
export const MAX_LINK_LENGTH = 2_048;

interface Link {
  readonly end: number;
  readonly start: number;
  /** The link as written. */
  readonly text: string;
  /** Where it goes: as written, with "https://" when it had no protocol. */
  readonly url: string;
}

/**
 * The link without the punctuation after it, keeping a closing bracket
 * that belongs to it ("…/Foo_(bar)").
 */
function trimPunctuation(match: string) {
  let text = match.replace(TRAILING_PUNCTUATION, "");
  while (
    match.length > text.length &&
    match[text.length] === ")" &&
    text.split("(").length > text.split(")").length
  ) {
    text = match.slice(0, text.length + 1);
  }
  return text;
}

function linksIn(body: string): Link[] {
  return [...body.matchAll(URL_PATTERN)].map((match) => {
    const text = trimPunctuation(match[0]);
    const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    return { end: match.index + text.length, start: match.index, text, url };
  });
}

/** The link a message's preview is made from: the first one in its body. */
export function previewedUrl(body: string) {
  return linksIn(body)[0]?.url;
}

/**
 * The links a message gets preview cards for, in order: its first
 * `MAX_LINK_PREVIEWS` different links.
 */
export function previewedUrls(body: string) {
  const urls: string[] = [];
  for (const { url } of linksIn(body)) {
    if (urls.length === MAX_LINK_PREVIEWS) break;
    if (url.length <= MAX_LINK_LENGTH && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

/** Trims spaces and tabs, but keeps line breaks. */
function trimEnd(text: string) {
  return text.replace(/[^\S\n]+$/, "");
}

function trimStart(text: string) {
  return text.replace(/^[^\S\n]+/, "");
}

/** Tidies the text on either side of a cut-out link so it reads naturally. */
function close(before: string, after: string): [string, string] {
  // "(https://…)" leaves nothing worth keeping between the brackets.
  if (before.endsWith("(") && after.startsWith(")")) {
    return close(trimEnd(before.slice(0, -1)), trimStart(after.slice(1)));
  }
  // Sentence punctuation after the link closes the text before it, unless
  // that text already ends in punctuation ("Look: https://….").
  const punctuation = /^[.,!?]+(?=\s|$)/.exec(after)?.[0];
  if (punctuation !== undefined) {
    const rest = trimStart(after.slice(punctuation.length));
    return [
      /[\p{L}\p{N}]$/u.test(before) ? before + punctuation : before,
      rest,
    ];
  }
  // A link on a line of its own takes its line with it.
  if (before.endsWith("\n") && after.startsWith("\n")) {
    return [before, after.slice(1)];
  }
  return [before, after];
}

function cut(body: string, link: Link) {
  const [before, after] = close(
    trimEnd(body.slice(0, link.start)),
    trimStart(body.slice(link.end)),
  );
  return before === "" ||
    after === "" ||
    before.endsWith("\n") ||
    after.startsWith("\n")
    ? before + after
    : `${before} ${after}`;
}

function tidy(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Whether a link ends its text: nothing but space and sentence punctuation
 * after it.
 */
function endsText(text: string, link: Link) {
  return /^[\s.,!?]*$/.test(text.slice(link.end));
}

/**
 * The body with its previewed link cut out when it ends the message, for
 * showing beside the preview card. Empty when the message was only the
 * link. (A PDS from before `linkPreviews` previews only the first link.)
 */
export function withoutPreviewedUrl(body: string) {
  const links = linksIn(body);
  const link = links[0];
  return link === undefined || links.length > 1 || !endsText(body, link)
    ? body
    : tidy(cut(body, link));
}

/**
 * The body with the links in `urls` cut from its end, for showing above
 * their preview cards: a link the message ends with (or is only) is left
 * to its card, and one with words after it stays in the text. Empty when
 * the message was only those links.
 */
export function withoutUrls(body: string, urls: readonly string[]) {
  let text = body;
  for (;;) {
    const link = linksIn(text).at(-1);
    if (
      link === undefined ||
      !urls.includes(link.url) ||
      !endsText(text, link)
    ) {
      return text === body ? body : tidy(text);
    }
    text = cut(text, link);
  }
}

/** Inline links longer than this show shortened. */
const MAX_SHOWN_LINK_LENGTH = 40;

/** A long link without its protocol and "www.", cut short. */
function shownLink(text: string) {
  if (text.length <= MAX_SHOWN_LINK_LENGTH) return text;
  const bare = text.replace(/^https?:\/\/(?:www\.)?/i, "");
  return bare.length <= MAX_SHOWN_LINK_LENGTH
    ? bare
    : `${bare.slice(0, MAX_SHOWN_LINK_LENGTH - 1)}…`;
}

/** A run of a message's text, or a link in it to show tappable. */
export interface TextPart {
  /** What to show. */
  readonly text: string;
  /** Where a link goes; absent for plain text. */
  readonly url?: string;
}

/** A message's text split into plain runs and its links, in order. */
export function textParts(body: string): TextPart[] {
  const parts: TextPart[] = [];
  let at = 0;
  for (const link of linksIn(body)) {
    if (link.start > at) parts.push({ text: body.slice(at, link.start) });
    parts.push({ text: shownLink(link.text), url: link.url });
    at = link.end;
  }
  if (at < body.length) parts.push({ text: body.slice(at) });
  return parts;
}
