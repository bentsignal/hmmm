import type { AttachmentSlot, MediaItem } from "./media-groups";
import type { Message } from "./types";
import type { ReactionPart } from "~/features/messaging/reactions";
import type { BubbleMedia } from "~/features/preferences/store";
import { attachmentPart } from "~/features/messaging/reactions";
import { usePreference } from "~/features/preferences/store";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { StackPress } from "./bubble-cards";
import { Deck } from "./bubble-deck";
import { Grid } from "./bubble-grid";
import { Depth, Fan, Peek } from "./bubble-piles";
import { useOpenGallery } from "./media-gallery";
import { attachmentSlots, mediaItems } from "./media-groups";
import { Reactable } from "./reaction-parts";

/**
 * Two or more photos and videos in a bubble conversation, drawn together as
 * `style` picks (see `BubbleMedia`) rather than one under another. A tap
 * opens the focused view (`MediaGallery`) to swipe through them and react
 * to each; a hold opens the menu for the one in front.
 */
export function BubbleMediaStack({
  message,
  items,
  isOwn,
  style,
}: {
  message: Message;
  items: readonly MediaItem[];
  isOwn: boolean;
  style: Exclude<BubbleMedia, "column">;
}) {
  const [front] = items;
  if (front === undefined) return null;
  if (style === "deck") {
    return <Deck message={message} items={items} isOwn={isOwn} />;
  }
  const pile =
    style === "fan" ? (
      <Fan items={items} isOwn={isOwn} />
    ) : style === "peek" ? (
      <Peek items={items} isOwn={isOwn} />
    ) : style === "depth" ? (
      <Depth items={items} isOwn={isOwn} />
    ) : (
      <Grid message={message} items={items} />
    );
  return (
    <StackPress message={message} front={front} preview={pile}>
      {pile}
    </StackPress>
  );
}

/**
 * The parts drawn together with a bubble's top one, when that's the first
 * of a stack of photos, whose tapbacks rise above it as one.
 */
export function useStackedTopParts(message: Message, top: ReactionPart) {
  const style = usePreference("bubbleMedia");
  const [first, ...rest] = mediaItems(message);
  if (style === "column" || rest.length === 0 || first?.part !== top) {
    return undefined;
  }
  return rest.map((item) => item.part);
}

/** One of a bubble's attachments, as it is, with its own reactions. */
function OneAttachment({
  message,
  index,
}: {
  message: Message;
  index: number;
}) {
  const attachment = message.attachments[index];
  if (attachment === undefined) return null;
  return (
    <Reactable part={attachmentPart(message, index)} place={index}>
      <AttachmentView
        attachment={attachment}
        sending={message.status === "sending"}
      />
    </Reactable>
  );
}

/**
 * A bubble's attachments, top to bottom: each on its own, or with two or
 * more photos and videos drawn together where the first of them is, as
 * `bubbleMedia` picks. A stack's tapbacks are all of its photos' at once,
 * and tapping them opens the focused view, where each has its own.
 */
export function BubbleAttachments({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const style = usePreference("bubbleMedia");
  const openGallery = useOpenGallery();
  // One under another, they keep their order, files among the photos.
  const slots =
    style === "column"
      ? message.attachments.map((_, index): AttachmentSlot => ({ index }))
      : attachmentSlots(message);
  return slots.map((slot) => {
    const attachment = message.attachments[slot.index];
    if (attachment === undefined) return null;
    if (slot.items === undefined || style === "column") {
      return (
        <OneAttachment
          key={attachmentKey(attachment)}
          message={message}
          index={slot.index}
        />
      );
    }
    const [first, ...rest] = slot.items;
    return (
      <Reactable
        key={attachmentKey(attachment)}
        part={first?.part ?? slot.index}
        place={slot.index}
        also={rest.map((item) => item.part)}
        onTapbacks={() => openGallery?.(message.id, slot.index)}
      >
        <BubbleMediaStack
          message={message}
          items={slot.items}
          isOwn={isOwn}
          style={style}
        />
      </Reactable>
    );
  });
}
