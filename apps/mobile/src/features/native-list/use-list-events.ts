import type { ReactNode } from "react";
import { useRouter } from "expo-router";

import type { HeldPart } from "./held-part";
import type { Lift, ListEvent } from "./native";
import type { MenuTarget } from "~/features/conversation/glass-message-menu";
import type { ToggleReaction } from "~/features/conversation/message-actions";
import type { Message, MessageAttachment } from "~/features/conversation/types";
import type { MessageLayout } from "~/features/preferences/store";
import { groupParam } from "~/features/conversation/media-group";
import { linkCardsOf } from "~/features/conversation/message-text";
import { showNotSent } from "~/features/conversation/not-sent";
import { showUploadProblem } from "~/features/conversation/upload-problem";
import { useOpenProfile } from "~/features/profile/use-open-profile";
import { impact } from "~/lib/native-extras";
import { openLink } from "~/lib/open-link";
import { heldPart, mediaOf } from "./held-part";
import { parseReactionKey } from "./map-rows";

type PressEvent = Extract<ListEvent, { type: "press" }>;
type HoldEvent = Extract<ListEvent, { type: "hold" }>;

/** Retries or removes an attachment that didn't upload; true if it was one. */
function handledStuck(attachment: MessageAttachment | undefined) {
  const upload = attachment?.upload;
  if (upload?.state !== "failed" && upload?.state !== "too-large") {
    return false;
  }
  showUploadProblem(upload);
  return true;
}

/** A message's photos and videos as the viewer's group. */
function viewerItems(message: Message) {
  return mediaOf(message).map(({ attachment }) => ({
    height: attachment.height,
    kind: attachment.kind === "video" ? ("video" as const) : ("image" as const),
    poster: attachment.localThumbnailUrl ?? attachment.thumbnailUrl,
    url: attachment.localUrl ?? attachment.url,
    width: attachment.width,
  }));
}

/** The file a tap landed on: by its address, or by its part. */
function fileOf(message: Message, event: PressEvent) {
  const byUrl = message.attachments.find(
    (attachment) =>
      attachment.kind === "file" &&
      event.url !== undefined &&
      (attachment.url === event.url || attachment.localUrl === event.url),
  );
  return byUrl ?? heldPart(message, event).attachment;
}

/** Opens a file, once it's uploaded, or offers to retry one that wasn't. */
function openFile(message: Message, event: PressEvent) {
  const attachment = fileOf(message, event);
  if (attachment === undefined || handledStuck(attachment)) return;
  const { upload } = attachment;
  if (upload === undefined || upload.state === "uploaded") {
    openLink(attachment.url);
  }
}

/** Opens a link card's page (its preview's canonical address). */
function openCard(message: Message, event: PressEvent) {
  const cards = linkCardsOf(message);
  const link = event.url ?? heldPart(message, event).link;
  const card = cards.find((each) => each.link === link);
  const url = card?.preview?.url ?? link;
  if (url !== undefined) openLink(url);
}

/** What the list's taps open, by what they landed on. */
interface PressActions {
  readonly openThread: ((message: Message) => void) | undefined;
  readonly openMedia: (message: Message, index: number) => void;
  readonly openProfile: (address: string) => void;
  readonly toggleReaction: ToggleReaction;
}

function onPress(event: PressEvent, message: Message, actions: PressActions) {
  function thread() {
    // A message still sending (or that failed) has no thread yet.
    if (message.status === undefined) actions.openThread?.(message);
  }
  const handlers = {
    author: () => actions.openProfile(message.authorId),
    file: () => openFile(message, event),
    link: () => event.url !== undefined && openLink(event.url),
    linkCard: () => openCard(message, event),
    media: () => actions.openMedia(message, event.index ?? 0),
    mention: () =>
      event.accountId !== undefined && actions.openProfile(event.accountId),
    message: thread,
    notSent: () => showNotSent(message.id),
    quote: thread,
    reaction: () => {
      if (event.reactionKey === undefined) return;
      const { emoji, part } = parseReactionKey(event.reactionKey);
      actions.toggleReaction(message.id, emoji, part);
    },
    replies: thread,
  } satisfies Record<PressEvent["element"], () => unknown>;
  // A binary that reports something this JavaScript doesn't know: nothing.
  if (Object.hasOwn(handlers, event.element)) handlers[event.element]();
}

/**
 * The glass menu over a held part. On a binary that lifts the message
 * itself (`lift`), the menu draws no copy and says where it goes; on older
 * ones, it lifts a React copy as the React Native list does.
 */
function menuTarget(
  event: HoldEvent,
  message: Message,
  {
    layout,
    self,
    preview,
    lift,
  }: {
    layout: MessageLayout;
    self: string;
    preview: (message: Message, held: HeldPart) => ReactNode;
    /** Set on binaries with the `lift` feature. */
    lift?: (lift: Lift | undefined) => void;
  },
) {
  const held = heldPart(message, event);
  const text = held.attachment === undefined && held.link === undefined;
  const align =
    layout === "bubbles" && message.authorId === self ? "end" : "start";
  return {
    align,
    attachment: held.attachment,
    link: held.link,
    message,
    mode: "actions",
    part: held.part,
    lift:
      lift === undefined
        ? undefined
        : {
            onLand: () => lift(undefined),
            onLift: (place) =>
              lift({
                index: event.index,
                origin: place.fromMiddle ? "middle" : align,
                part: event.part,
                rowId: event.rowId,
                scale: place.scale,
                shift: place.shift,
              }),
          },
    preview: lift === undefined ? preview(message, held) : null,
    rect: event.frame,
    // Stacked text lifts on a card; everything else as it is.
    shape: layout === "stacked" && text ? "card" : "plain",
  } satisfies MenuTarget;
}

/** Opens a message's photos and videos in the viewer, on `index`. */
function useOpenMedia() {
  const router = useRouter();
  return (message: Message, index: number) => {
    const item = mediaOf(message)[index];
    if (item === undefined || handledStuck(item.attachment)) return;
    router.push({
      params: { group: groupParam(viewerItems(message)), index: String(index) },
      pathname: "/media",
    });
  };
}

/**
 * What the native list's events do: the same actions the React Native
 * list's rows take (threads, profiles, links, reactions, retries, the
 * photo viewer), and a hold opens the glass menu over the held part.
 */
export function useListEvents({
  messageOf,
  openThread,
  toggleReaction,
  openMenu,
  menu,
  pages,
}: {
  /** The message a row shows, by the row's ID. */
  messageOf: (rowId: string) => Message | undefined;
  openThread: ((message: Message) => void) | undefined;
  toggleReaction: ToggleReaction;
  openMenu: (target: MenuTarget) => void;
  /** How the menu lifts a held part (see `menuTarget`). */
  menu: Parameters<typeof menuTarget>[2];
  /** The list's place: pages to load, the newest message, being ready. */
  pages: {
    onLoadOlder: () => void;
    onLoadNewer: () => void;
    onNearLatest: (near: boolean) => void;
    onReady: () => void;
  };
}) {
  const actions = {
    openMedia: useOpenMedia(),
    openProfile: useOpenProfile(),
    openThread,
    toggleReaction,
  } satisfies PressActions;

  function onMessage(event: HoldEvent | PressEvent) {
    const message = messageOf(event.rowId);
    if (message === undefined) return;
    if (event.type === "press") {
      onPress(event, message, actions);
      return;
    }
    // A message still sending (or that failed) has no menu, and a deleted
    // one has none.
    if (message.status !== undefined || message.deleted === true) return;
    impact();
    openMenu(menuTarget(event, message, menu));
  }

  return ({ nativeEvent: event }: { nativeEvent: ListEvent }) => {
    switch (event.type) {
      case "reachedOlder":
        pages.onLoadOlder();
        return;
      case "reachedNewer":
        pages.onLoadNewer();
        return;
      case "nearLatest":
        pages.onNearLatest(event.near);
        return;
      case "ready":
        pages.onReady();
        return;
      case "visible":
        // Read marks follow the newest message while it's open
        // (`useMarkRead`), as with the React Native list.
        return;
      case "press":
      case "hold":
        onMessage(event);
    }
  };
}
