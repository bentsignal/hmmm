import { textParts } from "@decentralized-convex/messages";

import type { MessageRow as BuiltRow } from "../conversation/build-rows.ts";
import type { ProfileOf } from "../conversation/message-row";
import type {
  Message,
  MessageAttachment,
  MemberNotice as Notice,
} from "../conversation/types.ts";
import type { ReactionSummary } from "../messaging/reactions";
import type {
  Block,
  FooterLine,
  MediaItem,
  MessageRow,
  Person,
  Reaction,
  Row,
  Span,
} from "./contract.ts";
import type { MessageLayout } from "~/features/preferences/store";
import {
  formatBytes,
  formatDaySeparator,
  formatTime,
  formatTimeHeader,
} from "../../lib/format.ts";
import { initials } from "../../lib/initials.ts";
import { arrivedAfter } from "../conversation/build-rows.ts";
import { mentionRanges } from "../conversation/mention-text.ts";
import { linkPart } from "../conversation/message-parts.ts";
import { linkCardsOf, visibleBody } from "../conversation/message-text.ts";
import { quoteText } from "../conversation/reply-parts.ts";
import { attachmentPart, parsePart } from "../messaging/reaction-part.ts";
import { typingLabel } from "../messaging/typing-state.ts";
import { isJumbo } from "./jumbo.ts";

// The app's messages, notices, and who's typing as the native list's rows
// (see contract.ts): newest first, built from the same rows the React
// Native list shows (`newestFirst` in build-rows.ts), with the same labels.

/** What the rows depend on besides the messages. */
export interface RowContext {
  readonly self: string;
  readonly layout: MessageLayout;
  /** Group chats, where incoming runs show their sender. */
  readonly showAuthors: boolean;
  readonly profileOf: ProfileOf;
  /** What the installed binary draws (see `nativeSupport`). */
  readonly support: {
    readonly rowKinds: readonly string[];
    readonly blockTypes: readonly string[];
  };
  /** When the conversation opened: rows after it arrived while open. */
  readonly openedAt: number;
  /** The message it opened on, tinted. */
  readonly anchorId?: string;
  /** For "Today" and "Yesterday"; now by default. */
  readonly now?: Date;
}

/** The ID of the typing row, which is always the newest. */
export const TYPING_ROW_ID = "typing";

/** "Not sent", under a message that failed. */
export const NOT_SENT_TEXT = "Not sent. Tap to try again.";
const DELETED_TEXT = "This message was deleted";
const EDITED_TEXT = "Edited";
/** A photo or video whose message doesn't know its size draws square. */
const UNKNOWN_SIZE = 1000;

export function personOf(address: string, profileOf: ProfileOf): Person {
  const { avatarUrl, displayName } = profileOf(address);
  return {
    avatarUrl,
    id: address,
    initials: initials(displayName),
    name: displayName,
  };
}

/** A part as the contract carries it (a string; see `parsePart`). */
export function partId(part: ReturnType<typeof attachmentPart> | string) {
  return String(part);
}

/**
 * A reaction's key on the native side: its part and emoji, so a tap on a
 * row's reactions says which part it was on.
 */
export function reactionKey(part: string, emoji: string) {
  return `${part} ${emoji}`;
}

/** A reaction key read back (see `reactionKey`). */
export function parseReactionKey(key: string) {
  const space = key.indexOf(" ");
  if (space === -1) return { emoji: key, part: parsePart("message") };
  return {
    emoji: key.slice(space + 1),
    part: parsePart(key.slice(0, space)),
  };
}

function reactionsFor(
  reactions: readonly ReactionSummary[] | undefined,
  parts: ReadonlySet<string>,
): Reaction[] {
  return (reactions ?? [])
    .filter((reaction) => parts.has(partId(reaction.part)))
    .map((reaction) => ({
      content: { emoji: reaction.emoji },
      count: reaction.count,
      key: reactionKey(partId(reaction.part), reaction.emoji),
      mine: reaction.mine,
    }));
}

/** Text with its @mentions and links as spans. */
export function spansOf(
  text: string,
  mentions: Message["mentions"],
): readonly Span[] {
  const spans: Span[] = [];
  function plain(from: number, to: number) {
    for (const part of textParts(text.slice(from, to))) {
      spans.push(
        part.url === undefined
          ? { text: part.text }
          : { style: "link", text: part.text, url: part.url },
      );
    }
  }
  let at = 0;
  for (const range of mentionRanges(text, mentions)) {
    plain(at, range.start);
    spans.push({
      accountId: range.accountId,
      style: "mention",
      text: text.slice(range.start, range.end),
    });
    at = range.end;
  }
  plain(at, text.length);
  return spans;
}

function isStuck(attachment: MessageAttachment) {
  const state = attachment.upload?.state;
  return state === "failed" || state === "too-large";
}

function mediaItem(
  message: Message,
  attachment: MessageAttachment,
  index: number,
): MediaItem {
  const part = partId(attachmentPart(message, index));
  const video = attachment.kind === "video";
  const known =
    (attachment.width ?? 0) > 0 && (attachment.height ?? 0) > 0;
  const poster = video
    ? (attachment.localThumbnailUrl ?? attachment.thumbnailUrl)
    : attachment.thumbnailUrl;
  return {
    durationSeconds:
      attachment.durationMs === undefined
        ? undefined
        : attachment.durationMs / 1000,
    height: known ? (attachment.height ?? 0) : UNKNOWN_SIZE,
    id: attachment.localUrl ?? attachment.url,
    kind: video ? "video" : "image",
    localUrl: attachment.localUrl,
    part,
    reactions: reactionsFor(message.reactions, new Set([part])),
    thumbnailUrl: poster,
    uploading: attachment.upload?.state === "uploading",
    url: attachment.url,
    width: known ? (attachment.width ?? 0) : UNKNOWN_SIZE,
  };
}

/**
 * A message's attachments as blocks: all of its photos and videos in one
 * media block where the first of them is, its files in place around it.
 */
function attachmentBlocks(message: Message): Block[] {
  const media = message.attachments.flatMap((attachment, index) =>
    attachment.kind === "file" ? [] : [mediaItem(message, attachment, index)],
  );
  const firstMedia = message.attachments.findIndex(
    (attachment) => attachment.kind !== "file",
  );
  return message.attachments.flatMap((attachment, index): Block[] => {
    if (attachment.kind === "file") {
      return [
        {
          name: attachment.name,
          part: partId(attachmentPart(message, index)),
          sizeLabel: isStuck(attachment)
            ? "Not uploaded. Tap to retry."
            : formatBytes(attachment.size),
          type: "file",
          url: attachment.url,
        },
      ];
    }
    if (index !== firstMedia) return [];
    const only = media.length === 1 ? media[0] : undefined;
    return [{ items: media, part: only?.part, type: "media" }];
  });
}

function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function linkCardBlocks(message: Message): Block[] {
  return linkCardsOf(message).map((card, index) => {
    const preview = card.preview ?? undefined;
    const video = preview?.video;
    return {
      description: preview?.description,
      imageHeight: video?.height,
      imageUrl: preview?.imageUrl,
      imageWidth: video?.width,
      part: linkPart(message, index),
      site: preview?.siteName ?? hostOf(card.link),
      title: preview?.title,
      type: "linkCard",
      url: card.link,
    };
  });
}

function textBlocks(message: Message): Block[] {
  const body = visibleBody(message);
  if (body === undefined) return [];
  return [
    {
      jumbo: isJumbo(body) ? true : undefined,
      part: "message",
      spans: spansOf(body, message.mentions),
      type: "text",
    },
  ];
}

function quoteBlocks(message: Message, profileOf: ProfileOf): Block[] {
  const { quote } = message;
  if (quote === undefined) return [];
  const attachment = quote.attachment;
  const thumbnail =
    attachment?.kind === "image"
      ? (attachment.thumbnailUrl ?? attachment.url)
      : attachment?.thumbnailUrl;
  return [
    {
      author: personOf(quote.authorId, profileOf),
      messageId: quote.messageId ?? message.threadId ?? "",
      text: quoteText(quote),
      thumbnailUrl: quote.deleted === true ? undefined : thumbnail,
      type: "quote",
    },
  ];
}

/**
 * A message's blocks, top to bottom. Bubbles put its photos over its text,
 * stacked rows its text first; link cards come last, a reply's quote first.
 */
export function blocksOf(
  message: Message,
  layout: MessageLayout,
  profileOf: ProfileOf,
): Block[] {
  if (message.deleted === true) {
    return [{ label: DELETED_TEXT, type: "deleted" }];
  }
  const middle =
    layout === "bubbles"
      ? [...attachmentBlocks(message), ...textBlocks(message)]
      : [...textBlocks(message), ...attachmentBlocks(message)];
  return [
    ...quoteBlocks(message, profileOf),
    ...middle,
    ...linkCardBlocks(message),
  ];
}

/** The lines under a message: its thread's count, "Edited", "Not sent". */
export function footerOf(message: Message, profileOf: ProfileOf) {
  const lines: FooterLine[] = [];
  const { thread } = message;
  const people = (thread?.repliers ?? []).map((address) =>
    personOf(address, profileOf),
  );
  if (message.quote !== undefined) {
    // A reply in the conversation: the thread's other replies.
    const more = (thread?.replyCount ?? 1) - 1;
    if (more > 0) {
      lines.push({
        kind: "replies",
        people,
        text: `View ${more} more ${more === 1 ? "reply" : "replies"}`,
      });
    }
  } else if (message.threadId === undefined && thread !== undefined) {
    const count = thread.replyCount;
    lines.push({
      kind: "replies",
      people,
      text: `${count} ${count === 1 ? "reply" : "replies"}`,
    });
  }
  if (message.editedAt !== undefined && message.deleted !== true) {
    lines.push({ kind: "edited", text: EDITED_TEXT });
  }
  if (message.status === "failed") {
    lines.push({ kind: "notSent", text: NOT_SENT_TEXT });
  }
  return lines;
}

function count(amount: number, one: string, many: string) {
  return amount === 1 ? one : `${amount} ${many}`;
}

/** A message in words: its text, or what it sent instead. */
export function summaryOf(message: Message) {
  if (message.deleted === true) return DELETED_TEXT;
  const words: string[] = [];
  const body = visibleBody(message);
  if (body !== undefined) words.push(body);
  const photos = message.attachments.filter((item) => item.kind === "image");
  const videos = message.attachments.filter((item) => item.kind === "video");
  const files = message.attachments.filter((item) => item.kind === "file");
  if (photos.length > 0) words.push(count(photos.length, "Photo", "photos"));
  if (videos.length > 0) words.push(count(videos.length, "Video", "videos"));
  for (const file of files) words.push(`File: ${file.name}`);
  for (const card of linkCardsOf(message)) {
    words.push(card.preview?.title ?? card.link);
  }
  return words.length > 0 ? words.join(", ") : "Message";
}

function reactionWords(reactions: readonly Reaction[]) {
  return reactions.map((reaction) => {
    const content =
      "emoji" in reaction.content
        ? reaction.content.emoji
        : reaction.content.label;
    return `${content} ${reaction.count}`;
  });
}

function accessibilityLabelOf(
  message: Message,
  author: Person,
  timeLabel: string,
  reactions: readonly Reaction[],
  footer: readonly FooterLine[],
) {
  const quoted =
    message.quote === undefined
      ? []
      : [`Reply to ${quoteText(message.quote)}`];
  return [
    author.name,
    ...quoted,
    summaryOf(message),
    timeLabel,
    ...reactionWords(reactions),
    ...footer.map((line) => line.text),
  ].join(", ");
}

/** The parts of a message whose reactions show on its row, not an item. */
function rowParts(message: Message) {
  const media = new Set(
    message.attachments.flatMap((attachment, index) =>
      attachment.kind === "file" ? [] : [partId(attachmentPart(message, index))],
    ),
  );
  const parts = new Set<string>(["message"]);
  message.attachments.forEach((_, index) =>
    parts.add(partId(attachmentPart(message, index))),
  );
  linkCardsOf(message).forEach((_, index) =>
    parts.add(linkPart(message, index)),
  );
  for (const part of media) parts.delete(part);
  return parts;
}

export function messageRow(
  row: Extract<BuiltRow, { type: "message" }>,
  context: RowContext,
): MessageRow {
  const { message } = row;
  const { layout, profileOf, self, showAuthors } = context;
  const isOwn = message.authorId === self;
  const author = personOf(message.authorId, profileOf);
  const timeLabel = formatTime(message.sentAt);
  const reactions = reactionsFor(message.reactions, rowParts(message));
  const footer = footerOf(message, profileOf);
  return {
    accessibilityLabel: accessibilityLabelOf(
      message,
      author,
      timeLabel,
      reactions,
      footer,
    ),
    arrived: arrivedAfter(row, context.openedAt) ? true : undefined,
    author,
    blocks: blocksOf(message, layout, profileOf),
    endsGroup: row.endsGroup,
    fallbackText: `${author.name}: ${summaryOf(message)}`,
    footer,
    highlighted: row.key === context.anchorId ? true : undefined,
    id: row.key,
    isOwn,
    kind: "message",
    layout,
    reactions,
    sentAt: message.sentAt.getTime(),
    showAuthor: layout === "stacked" || (showAuthors && !isOwn),
    startsGroup: row.startsGroup,
    status: message.status,
    timeLabel,
  };
}

/** "Maya joined the conversation". */
export function noticeSpans(notice: Notice): readonly Span[] {
  return [
    { style: "bold", text: notice.name },
    {
      text:
        notice.kind === "joined"
          ? " joined the conversation"
          : " left the conversation",
    },
  ];
}

/** One built row as the native list's row. */
export function nativeRow(built: BuiltRow, context: RowContext): Row {
  switch (built.type) {
    case "message":
      return messageRow(built, context);
    case "notice": {
      const spans = noticeSpans(built.notice);
      return {
        fallbackText: spans.map((span) => span.text).join(""),
        id: built.key,
        kind: "notice",
        spans,
      };
    }
    case "replies": {
      // A thread's divider under its original: a day separator's look.
      const label = `${built.count} ${built.count === 1 ? "reply" : "replies"}`;
      return {
        fallbackText: label,
        id: built.key,
        kind: "header",
        label,
        style: "day",
      };
    }
    case "day": {
      const label = formatDaySeparator(built.date, context.now);
      return {
        fallbackText: label,
        id: built.key,
        kind: "header",
        label,
        style: "day",
      };
    }
    case "time": {
      const { day, time } = formatTimeHeader(built.date, context.now);
      const label = `${day} ${time}`;
      return {
        fallbackText: label,
        id: built.key,
        kind: "header",
        label,
        style: "time",
      };
    }
  }
}

/** Who's typing, as the newest row; none when nobody is. */
export function typingRow(
  typists: readonly string[],
  context: RowContext,
): Row[] {
  if (typists.length === 0) return [];
  const people = typists.map((address) =>
    personOf(address, context.profileOf),
  );
  const label = typingLabel(people.map((person) => person.name));
  return [
    {
      fallbackText: label,
      id: TYPING_ROW_ID,
      kind: "typing",
      label,
      layout: context.layout,
      people,
    },
  ];
}

/** A block's text, for a binary that can't draw it. */
function blockText(block: Block) {
  switch (block.type) {
    case "text":
      return block.spans.map((span) => span.text).join("");
    case "media":
      return block.items.length === 1
        ? block.items[0]?.kind === "video"
          ? "Video"
          : "Photo"
        : `${block.items.length} photos and videos`;
    case "file":
      return `File: ${block.name}`;
    case "linkCard":
      return block.title ?? block.url;
    case "quote":
      return `Reply to ${block.author.name}: ${block.text}`;
    case "deleted":
      return block.label;
  }
}

/**
 * The row as this binary can draw it: a block it doesn't know becomes its
 * text, and a row kind it doesn't know becomes a `custom` row of its
 * `fallbackText`.
 */
export function supported(row: Row, support: RowContext["support"]): Row {
  if (!support.rowKinds.includes(row.kind)) {
    return {
      component: row.kind,
      fallbackText: row.fallbackText ?? "",
      id: row.id,
      kind: "custom",
    };
  }
  if (row.kind !== "message") return row;
  const unknown = row.blocks.some(
    (block) => !support.blockTypes.includes(block.type),
  );
  if (!unknown) return row;
  const canText = support.blockTypes.includes("text");
  return {
    ...row,
    blocks: row.blocks.flatMap((block): Block[] => {
      if (support.blockTypes.includes(block.type)) return [block];
      if (!canText) return [];
      return [{ part: block.part, spans: [{ text: blockText(block) }], type: "text" }];
    }),
  };
}

/**
 * The native list's rows, newest first: who's typing, then `rows` (the
 * React Native list's, from `newestFirst`).
 */
export function nativeRows(
  rows: readonly BuiltRow[],
  typists: readonly string[],
  context: RowContext,
): Row[] {
  return [
    ...typingRow(typists, context),
    ...rows.map((row) => nativeRow(row, context)),
  ].map((row) => supported(row, context.support));
}
