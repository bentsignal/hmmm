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
  /** In a thread, between its original and the replies. */
  | { type: "replies"; key: string; date: Date; count: number }
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
  rootId: string | undefined,
) {
  if (previous === undefined || next === undefined) return false;
  if (previous.authorId !== next.authorId) return false;
  // A reply card stands on its own, and a thread's original stands apart
  // from its replies.
  if (previous.quote !== undefined || next.quote !== undefined) return false;
  if (previous.id === rootId) return false;
  if (needsHeader(layout, previous, next)) return false;
  return (
    layout === "bubbles" ||
    next.sentAt.getTime() - previous.sentAt.getTime() < GROUP_WINDOW_MS
  );
}

type MessageRowOf = Extract<MessageRow, { type: "message" }>;
type HeaderRow = Extract<MessageRow, { type: "day" | "time" }>;

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

/** A thread's original, which its replies follow under a divider. */
export interface ThreadRoot {
  readonly id: string;
  /** How many replies the divider counts. */
  readonly count: number;
}

/** The divider under a thread's original. */
function dividerAfter(message: Message, root: ThreadRoot | undefined) {
  if (root?.id !== message.id) return [];
  return [
    {
      count: root.count,
      date: message.sentAt,
      key: "replies",
      type: "replies",
    } satisfies MessageRow,
  ];
}

/**
 * Interleaves headers with messages, oldest first: a time header after
 * each pause for bubbles, a day separator for stacked rows. In a thread,
 * the original comes first, then a divider counting its replies.
 */
export function buildMessageRows(
  messages: readonly Message[],
  layout: MessageLayout,
  root?: ThreadRoot,
) {
  return messages.flatMap((message, index): MessageRow[] => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const row = messageRow(
      message,
      !continues(layout, previous, message, root?.id),
      !continues(layout, message, next, root?.id),
    );
    const divider = dividerAfter(message, root);
    if (!needsHeader(layout, previous, message)) {
      built.set(message, { row });
      return [row, ...divider];
    }
    const header = headerRow(message, layout === "bubbles" ? "time" : "day");
    built.set(message, { header, row });
    return [header, row, ...divider];
  });
}

/** Whether a row came in after the conversation opened, at `openedAt`. */
export function arrivedAfter(row: MessageRow, openedAt: number) {
  if (row.type === "replies") return false;
  const date = row.type === "message" ? row.message.sentAt : row.date;
  return date.getTime() > openedAt;
}

/**
 * Where a row sits in the list, oldest first, as a number a worklet can
 * compare: its message's time, or just before it for the header above it.
 */
export function rowOrder(date: Date, header = false) {
  return date.getTime() - (header ? 0.5 : 0);
}

/**
 * Rows newest first, as the inverted list lays them out from the bottom.
 * A thread's original comes before its replies.
 */
export function newestFirst(
  messages: readonly Message[],
  layout: MessageLayout,
  thread: ThreadHead | undefined,
) {
  if (thread === undefined) return buildMessageRows(messages, layout).reverse();
  return buildMessageRows([thread.root, ...messages], layout, {
    count: thread.replyCount,
    id: thread.root.id,
  }).reverse();
}

/** In a thread: the message it answers, and how many replies it has. */
export interface ThreadHead {
  readonly root: Message;
  readonly replyCount: number;
}
