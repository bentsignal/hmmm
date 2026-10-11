import {
  previewedUrl,
  withoutPreviewedUrl,
  withoutUrls,
} from "@decentralized-convex/messages";

import type { LinkCard, Message } from "./types";

/**
 * The preview cards under a message, in order. A PDS that predates
 * `linkPreviews` only previews the first link, once fetched.
 */
export function linkCardsOf(message: Message) {
  if (message.linkPreviews !== undefined) return message.linkPreviews;
  if (message.linkPreview === undefined) return [];
  const link = previewedUrl(message.body ?? "") ?? message.linkPreview.url;
  return [{ link, preview: message.linkPreview }] satisfies LinkCard[];
}

/** The text to show for a message; previewed links are left to their cards. */
export function visibleBody(message: Message) {
  if (message.body === undefined) return undefined;
  let text = message.body;
  if (message.linkPreviews !== undefined) {
    text = withoutUrls(
      message.body,
      message.linkPreviews.map((card) => card.link),
    );
  } else if (message.linkPreview !== undefined) {
    text = withoutPreviewedUrl(message.body);
  }
  return text.length > 0 ? text : undefined;
}
