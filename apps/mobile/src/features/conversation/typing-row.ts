import type { MessageRow } from "./build-rows";
import type { Message } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { linkCardsOf, visibleBody } from "./message-text";

// Who's typing is the list's newest row (see `TypingRow`).

/** The typing row's order: newer than any message (see `rowOrder`). */
export const TYPING_ORDER = Number.MAX_VALUE;

/** The list's newest row, under every message. */
const TYPING_ITEM = { key: "typing", type: "typing" } as const;

export type ListRow = MessageRow | typeof TYPING_ITEM;

/** The list's rows, newest first: who's typing, then `rows`. */
export function withTyping(rows: readonly MessageRow[]) {
  return [TYPING_ITEM, ...rows];
}

/** Whether a message can grow out of the typing bubble: plain text. */
export function morphs(message: Message, layout: MessageLayout) {
  return (
    layout === "bubbles" &&
    message.attachments.length === 0 &&
    message.quote === undefined &&
    visibleBody(message) !== undefined &&
    linkCardsOf(message).length === 0
  );
}
