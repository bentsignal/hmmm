import type { Message as PdsMessage } from "@decentralized-convex/messages";

import type { OutgoingItem, OutgoingMessage } from "./outbox";
import type { ReactionSummary } from "./reactions";
import type {
  Message,
  MessageAttachment,
  ThreadInfo,
} from "~/features/conversation/types";
import { toMessage } from "./conversations";

// Messages as a conversation or thread shows them: the PDS's, and this
// device's sends it hasn't confirmed, drawn from local copies.

/**
 * A sent message, with the link cards this device prefetched where the
 * PDS is still fetching (so a card shown when it was sent stays up).
 */
function withPrefetched(
  message: PdsMessage,
  sent: OutgoingMessage | undefined,
) {
  const prefetched = sent?.linkPreviews;
  if (prefetched === undefined || message.linkPreviews === undefined) {
    return message;
  }
  return {
    ...message,
    linkPreviews: message.linkPreviews.map((card) =>
      card.preview === undefined
        ? (prefetched.find(({ link }) => link === card.link) ?? card)
        : card,
    ),
  };
}

/** An attachment still uploading, shown from this device's copy. */
function localAttachment(messageId: string, item: OutgoingItem) {
  const { file } = item;
  return {
    ...item.attachment,
    durationMs: file.durationMs,
    height: file.height,
    kind: file.kind,
    localThumbnailUrl: file.poster?.uri,
    localUrl: file.uri,
    mimeType: file.mimeType,
    name: file.name,
    size: file.size,
    thumbnailUrl: item.attachment?.thumbnailUrl ?? file.poster?.uri,
    upload: { itemId: item.id, messageId, state: item.state },
    url: item.attachment?.url ?? file.uri,
    width: file.width,
  } satisfies MessageAttachment;
}

/**
 * A confirmed message's attachments, still drawn from this device's
 * copies when it sent them, so nothing reloads when the PDS confirms it.
 */
function withLocalMedia(
  message: PdsMessage,
  sent: OutgoingMessage | undefined,
) {
  if (sent === undefined) return message.attachments;
  return message.attachments.map((attachment) => {
    const item = sent.items.find(
      ({ attachment: uploaded }) => uploaded?.url === attachment.url,
    );
    return item === undefined
      ? attachment
      : {
          ...attachment,
          localThumbnailUrl: item.file.poster?.uri,
          localUrl: item.file.uri,
        };
  });
}

function unconfirmedStatus(status: OutgoingMessage["status"]) {
  if (status === "sent") return undefined;
  return status;
}

function unconfirmedMessage(
  message: OutgoingMessage,
  address: string,
  conversationId: string,
) {
  return {
    ...toMessage(
      {
        attachments: [],
        authorId: address,
        authorName: "",
        body: message.body,
        conversationId,
        linkPreview: null,
        linkPreviews: message.linkPreviews,
        messageId: message.messageId,
        quote: message.reply?.quote,
        sentAt: message.sentAt,
        threadId: message.reply?.threadId,
      },
      [],
      message.items.map((item) => localAttachment(message.messageId, item)),
    ),
    // One the PDS took shows as sent, even before the conversation's
    // pages list it.
    status: unconfirmedStatus(message.status),
  };
}

/**
 * How a message shows: in the conversation (where a reply shows as a card
 * quoting its original, with its thread's count), or in its thread.
 */
export interface Shown {
  readonly reactions: readonly ReactionSummary[] | undefined;
  readonly sent: OutgoingMessage | undefined;
  readonly thread: ThreadInfo | undefined;
  /** In a thread, a reply shows without its quote. */
  readonly inThread: boolean;
}

/**
 * Each message as the conversation shows it, kept from render to render
 * while what it's made from is the same, so its row doesn't redraw when
 * something else in the conversation changes.
 */
const shown = new WeakMap<
  PdsMessage | OutgoingMessage,
  { readonly message: Message; readonly how: Shown }
>();

function sameShown(left: Shown, right: Shown) {
  return (
    left.reactions === right.reactions &&
    left.sent === right.sent &&
    left.inThread === right.inThread &&
    left.thread?.replyCount === right.thread?.replyCount &&
    left.thread?.repliers.join() === right.thread?.repliers.join()
  );
}

function shownAs(message: Message, how: Shown) {
  return {
    ...message,
    quote: how.inThread ? undefined : message.quote,
    thread: how.thread,
  };
}

export function shownMessage(message: PdsMessage, how: Shown) {
  const cached = shown.get(message);
  if (cached !== undefined && sameShown(cached.how, how)) {
    return cached.message;
  }
  const result = shownAs(
    toMessage(
      withPrefetched(message, how.sent),
      how.reactions,
      withLocalMedia(message, how.sent),
    ),
    how,
  );
  shown.set(message, { how, message: result });
  return result;
}

export function shownUnconfirmed(
  message: OutgoingMessage,
  how: Shown & { address: string; conversationId: string },
) {
  const cached = shown.get(message);
  if (cached !== undefined && sameShown(cached.how, how)) {
    return cached.message;
  }
  const result = shownAs(
    unconfirmedMessage(message, how.address, how.conversationId),
    how,
  );
  shown.set(message, { how, message: result });
  return result;
}
