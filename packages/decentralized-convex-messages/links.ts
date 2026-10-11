const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[).,!?]+$/;

/** At most this many links in a message get a preview card each. */
export const MAX_LINK_PREVIEWS = 4;
/** Longer links are left as text. */
export const MAX_LINK_LENGTH = 2_048;

interface Link {
  readonly end: number;
  readonly start: number;
  readonly url: string;
}

function linksIn(body: string): Link[] {
  return [...body.matchAll(URL_PATTERN)].map((match) => {
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    return { end: match.index + url.length, start: match.index, url };
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
 * The body with its previewed link cut out, for showing beside the preview
 * card. Empty when the message was only the link.
 */
export function withoutPreviewedUrl(body: string) {
  const link = linksIn(body)[0];
  return link === undefined ? body : tidy(cut(body, link));
}

/**
 * The body with every appearance of `urls` cut out, for showing above
 * their preview cards. Empty when the message was only those links.
 */
export function withoutUrls(body: string, urls: readonly string[]) {
  if (urls.length === 0) return body;
  let text = body;
  for (;;) {
    const link = linksIn(text).find(({ url }) => urls.includes(url));
    if (link === undefined) return tidy(text);
    text = cut(text, link);
  }
}
