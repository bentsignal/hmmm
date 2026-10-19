import type { Message, MessageAttachment } from "./types";
import type { ReactionPart } from "~/features/messaging/reactions";
import type { BubbleMedia } from "~/features/preferences/store";
import { attachmentPart } from "~/features/messaging/reactions";

/** A photo or video of a message, with where it is among its attachments. */
export interface MediaItem {
  readonly attachment: MessageAttachment;
  /** Its index in the message's attachments. */
  readonly index: number;
  /** The part its reactions are on (see `attachmentPart`). */
  readonly part: ReactionPart;
}

/**
 * What one of a message's attachments draws as: itself, or with `items`,
 * all of its photos and videos together.
 */
export interface AttachmentSlot {
  readonly index: number;
  readonly items?: readonly MediaItem[];
}

/** A message's photos and videos, in order. */
export function mediaItems(message: Message) {
  return message.attachments.flatMap((attachment, index): MediaItem[] =>
    attachment.kind === "file"
      ? []
      : [{ attachment, index, part: attachmentPart(message, index) }],
  );
}

/**
 * A message's attachments as they draw: one by one, or with two or more
 * photos and videos together (a carousel, a stack) where the first of
 * them is, its files staying in place around them.
 */
export function attachmentSlots(message: Message) {
  const media = mediaItems(message);
  const first = media[0];
  const grouped = media.length >= 2 && first !== undefined;
  return message.attachments.flatMap((attachment, index): AttachmentSlot[] => {
    if (!grouped || attachment.kind === "file") return [{ index }];
    return index === first.index ? [{ index, items: media }] : [];
  });
}

/** Whether a part is one of a message's grouped photos and videos. */
export function isGroupedMedia(message: Message, part: ReactionPart) {
  const media = mediaItems(message);
  return media.length >= 2 && media.some((item) => item.part === part);
}

/**
 * The parts drawn together with a bubble's top one, when that's the first
 * of a stack of photos (`style` isn't `column`), whose tapbacks rise above
 * it as one.
 */
export function stackedTopParts(
  message: Message,
  top: ReactionPart,
  style: BubbleMedia,
) {
  const [first, ...rest] = mediaItems(message);
  if (style === "column" || rest.length === 0 || first?.part !== top) {
    return undefined;
  }
  return rest.map((item) => item.part);
}
