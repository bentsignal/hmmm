import type { Message } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { isSameDay } from "~/lib/format";

/** Bubbles get a time header after a pause this long, like iMessage. */
const HEADER_GAP_MS = 60 * 60 * 1000;
/** Stacked rows group an author's messages sent within this window. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageRow =
  | { type: "day"; key: string; date: Date }
  | { type: "time"; key: string; date: Date }
  | {
      type: "message";
      key: string;
      message: Message;
      /** First message of a run by the same author. */
      startsGroup: boolean;
      /** Last message of a run; bubbles draw their tail here. */
      endsGroup: boolean;
    };

function needsHeader(
  layout: MessageLayout,
  previous: Message | undefined,
  message: Message,
) {
  if (previous === undefined) return true;
  if (!isSameDay(previous.sentAt, message.sentAt)) return true;
  return (
    layout === "bubbles" &&
    message.sentAt.getTime() - previous.sentAt.getTime() >= HEADER_GAP_MS
  );
}

function continues(
  layout: MessageLayout,
  previous: Message | undefined,
  next: Message | undefined,
) {
  if (previous === undefined || next === undefined) return false;
  if (previous.authorId !== next.authorId) return false;
  if (needsHeader(layout, previous, next)) return false;
  return (
    layout === "bubbles" ||
    next.sentAt.getTime() - previous.sentAt.getTime() < GROUP_WINDOW_MS
  );
}

type MessageRowOf = Extract<MessageRow, { type: "message" }>;
type HeaderRow = Exclude<MessageRow, { type: "message" }>;

/**
 * Each message's rows from the last build, reused while they come out the
 * same, so the list only redraws rows that changed.
 */
const built = new WeakMap<
  Message,
  { readonly row: MessageRowOf; readonly header?: HeaderRow }
>();

function messageRow(
  message: Message,
  startsGroup: boolean,
  endsGroup: boolean,
) {
  const last = built.get(message)?.row;
  if (last?.startsGroup === startsGroup && last.endsGroup === endsGroup) {
    return last;
  }
  return {
    endsGroup,
    key: message.id,
    message,
    startsGroup,
    type: "message",
  } satisfies MessageRowOf;
}

function headerRow(message: Message, type: HeaderRow["type"]) {
  const last = built.get(message)?.header;
  if (last?.type === type) return last;
  return { date: message.sentAt, key: `${type}-${message.id}`, type };
}

/**
 * Interleaves headers with messages, oldest first: a time header after
 * each pause for bubbles, a day separator for stacked rows.
 */
export function buildMessageRows(
  messages: readonly Message[],
  layout: MessageLayout,
) {
  return messages.flatMap((message, index): MessageRow[] => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const row = messageRow(
      message,
      !continues(layout, previous, message),
      !continues(layout, message, next),
    );
    if (!needsHeader(layout, previous, message)) {
      built.set(message, { row });
      return [row];
    }
    const header = headerRow(message, layout === "bubbles" ? "time" : "day");
    built.set(message, { header, row });
    return [header, row];
  });
}
