import type { MemberNotice, Message } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { isSameDay } from "../../lib/format.ts";
import { Orders, rowOrder } from "./orders.ts";

/** Bubbles get a time header after a pause this long, like iMessage. */
const HEADER_GAP_MS = 60 * 60 * 1000;
/** Stacked rows group an author's messages sent within this window. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageRow =
  /**
   * A header over the messages of a day (stacked) or after a pause
   * (bubbles). `opensThread` over a thread's original, with nothing above;
   * `author` is then the original's sender.
   */
  | {
      type: "day";
      key: string;
      order: number;
      /** The message or notice it's over. */
      owner: string;
      date: Date;
      opensThread: boolean;
      author?: string;
    }
  | {
      type: "time";
      key: string;
      order: number;
      /** The message or notice it's over. */
      owner: string;
      date: Date;
      opensThread: boolean;
      author?: string;
    }
  /** In a thread, between its original and the replies. */
  | { type: "replies"; key: string; order: number; date: Date; count: number }
  /** Someone joining or leaving a group. */
  | {
      type: "notice";
      key: string;
      order: number;
      notice: MemberNotice;
      /** Right under another notice, so it sits closer. */
      followsNotice: boolean;
    }
  | {
      type: "message";
      key: string;
      /**
       * Where it sits in the list, as a number a worklet can compare (see
       * `Orders`): every row's is different, oldest first.
       */
      order: number;
      message: Message;
      /** First message of a run by the same author. */
      startsGroup: boolean;
      /** Last message of a run; bubbles draw their tail here. */
      endsGroup: boolean;
    };

/** What the list shows in order: messages, and notices between them. */
type Item =
  | { readonly type: "message"; readonly message: Message }
  | { readonly type: "notice"; readonly notice: MemberNotice };

function dateOf(item: Item) {
  return item.type === "message" ? item.message.sentAt : item.notice.at;
}

function messageOf(item: Item | undefined) {
  return item?.type === "message" ? item.message : undefined;
}

function needsHeader(
  layout: MessageLayout,
  previous: Item | undefined,
  item: Item,
) {
  if (previous === undefined) return true;
  const before = dateOf(previous);
  const date = dateOf(item);
  if (!isSameDay(before, date)) return true;
  return (
    layout === "bubbles" && date.getTime() - before.getTime() >= HEADER_GAP_MS
  );
}

function continues(
  layout: MessageLayout,
  previousItem: Item | undefined,
  nextItem: Item | undefined,
  rootId: string | undefined,
) {
  // A notice ends a run, and the message after it starts a new one.
  const previous = messageOf(previousItem);
  const next = messageOf(nextItem);
  if (previous === undefined || next === undefined) return false;
  if (previous.authorId !== next.authorId) return false;
  // A reply card stands on its own, and a thread's original stands apart
  // from its replies.
  if (previous.quote !== undefined || next.quote !== undefined) return false;
  if (previous.id === rootId) return false;
  if (needsHeader(layout, previousItem, { message: next, type: "message" })) {
    return false;
  }
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
  { startsGroup, endsGroup }: { startsGroup: boolean; endsGroup: boolean },
  order: number,
) {
  const last = built.get(message)?.row;
  if (
    last?.startsGroup === startsGroup &&
    last.endsGroup === endsGroup &&
    last.order === order
  ) {
    return last;
  }
  return {
    endsGroup,
    key: message.id,
    message,
    order,
    startsGroup,
    type: "message",
  } satisfies MessageRowOf;
}

function headerRow(
  message: Message,
  { type, opensThread }: { type: HeaderRow["type"]; opensThread: boolean },
  order: number,
) {
  const last = built.get(message)?.header;
  if (
    last?.type === type &&
    last.opensThread === opensThread &&
    last.order === order
  ) {
    return last;
  }
  return {
    author: opensThread ? message.authorId : undefined,
    date: message.sentAt,
    key: `${type}-${message.id}`,
    opensThread,
    order,
    owner: message.id,
    type,
  } satisfies HeaderRow;
}

/** Each notice's rows from the last build, like `built`. */
const builtNotices = new WeakMap<
  MemberNotice,
  { readonly row: NoticeRow; readonly header?: HeaderRow }
>();

type NoticeRow = Extract<MessageRow, { type: "notice" }>;

/** A notice's row, and the header above it when it needs one. */
function noticeRows(
  notice: MemberNotice,
  {
    header,
    followsNotice,
  }: { header: HeaderRow["type"] | null; followsNotice: boolean },
  orders: Orders,
) {
  const last = builtNotices.get(notice);
  const above =
    header === null
      ? undefined
      : noticeHeader(
          notice,
          { last: last?.header, type: header },
          orders.next(rowOrder(notice.at, true)),
        );
  const order = orders.next(rowOrder(notice.at));
  const row =
    last?.row.followsNotice === followsNotice && last.row.order === order
      ? last.row
      : ({
          followsNotice,
          key: notice.id,
          notice,
          order,
          type: "notice",
        } satisfies NoticeRow);
  builtNotices.set(notice, { header: above, row });
  return above === undefined ? [row] : [above, row];
}

/** The header above a notice, the same as `last` if it comes out so. */
function noticeHeader(
  notice: MemberNotice,
  { type, last }: { type: HeaderRow["type"]; last: HeaderRow | undefined },
  order: number,
) {
  if (last?.type === type && last.order === order) return last;
  return {
    date: notice.at,
    key: `${type}-${notice.id}`,
    opensThread: false,
    order,
    owner: notice.id,
    type,
  } satisfies HeaderRow;
}

/**
 * Messages and notices in one list, oldest first; a notice comes after
 * messages sent at the same moment.
 */
function timeline(
  messages: readonly Message[],
  notices: readonly MemberNotice[],
) {
  const items = messages.map((message): Item => ({ message, type: "message" }));
  if (notices.length === 0) return items;
  // Stable, and messages come first, so ties keep that order.
  return [
    ...items,
    ...notices.map((notice): Item => ({ notice, type: "notice" })),
  ].sort((left, right) => dateOf(left).getTime() - dateOf(right).getTime());
}

/** A thread's original, which its replies follow under a divider. */
export interface ThreadRoot {
  readonly id: string;
  /** How many replies the divider counts. */
  readonly count: number;
}

/** The divider under a thread's original. */
function dividerAfter(
  message: Message,
  root: ThreadRoot | undefined,
  orders: Orders,
) {
  if (root?.id !== message.id) return [];
  return [
    {
      count: root.count,
      date: message.sentAt,
      key: "replies",
      // Just after its original.
      order: orders.next(rowOrder(message.sentAt) + 0.25),
      type: "replies",
    } satisfies MessageRow,
  ];
}

/**
 * Interleaves headers with messages, oldest first: a time header after
 * each pause for bubbles, a day separator for stacked rows. In a thread,
 * the original comes first, then a divider counting its replies. A
 * group's notices sit between its messages, by time.
 */
export function buildMessageRows(
  messages: readonly Message[],
  layout: MessageLayout,
  root?: ThreadRoot,
  notices: readonly MemberNotice[] = [],
) {
  const items = timeline(messages, notices);
  const headerType = layout === "bubbles" ? "time" : "day";
  const orders = new Orders();
  return items.flatMap((item, index): MessageRow[] => {
    const previous = items[index - 1];
    const header = needsHeader(layout, previous, item);
    if (item.type === "notice") {
      return noticeRows(
        item.notice,
        {
          followsNotice: !header && previous?.type === "notice",
          header: header ? headerType : null,
        },
        orders,
      );
    }
    const { message } = item;
    const above = header
      ? headerRow(
          message,
          { opensThread: message.id === root?.id, type: headerType },
          orders.next(rowOrder(message.sentAt, true)),
        )
      : undefined;
    const row = messageRow(
      message,
      {
        endsGroup: !continues(layout, item, items[index + 1], root?.id),
        startsGroup: !continues(layout, previous, item, root?.id),
      },
      orders.next(rowOrder(message.sentAt)),
    );
    const divider = dividerAfter(message, root, orders);
    built.set(message, { header: above, row });
    return above === undefined ? [row, ...divider] : [above, row, ...divider];
  });
}

/** Whether a row came in after the conversation opened, at `openedAt`. */
export function arrivedAfter(row: MessageRow, openedAt: number) {
  if (row.type === "replies") return false;
  return dateOfRow(row).getTime() > openedAt;
}

function dateOfRow(row: Exclude<MessageRow, { type: "replies" }>) {
  switch (row.type) {
    case "message":
      return row.message.sentAt;
    case "notice":
      return row.notice.at;
    case "day":
    case "time":
      return row.date;
    default:
      return row satisfies never;
  }
}

/**
 * Rows newest first, as the inverted list lays them out from the bottom.
 * A thread's original comes before its replies.
 */
export function newestFirst(
  messages: readonly Message[],
  layout: MessageLayout,
  thread: ThreadHead | undefined,
  notices: readonly MemberNotice[] = [],
) {
  if (thread === undefined) {
    return buildMessageRows(messages, layout, undefined, notices).reverse();
  }
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
