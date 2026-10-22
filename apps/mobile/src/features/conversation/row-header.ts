import type { MessageRow } from "./build-rows";
import type { MessageLayout } from "~/features/preferences/store";

// What sits above a message in its row because of its place in a run: the
// space between it and the row above, and the sender's name. A row's
// header changes when the message before it is deleted (it starts a run
// now, or joins the one above), so the list knows its height up front
// (see `useLeavingRows` and `Settle`).

/**
 * Bubbles: the space above a run's first bubble and above the rest, and
 * the sender's line above an incoming run in a group, with the gap under
 * it.
 */
export const BUBBLE_HEADER = {
  gap: 4,
  nameGap: 6,
  nameLine: 16,
  runGap: 14,
} as const;
/** Stacked rows: the space above a run's first row, and above the rest. */
export const STACKED_RUN_GAP = 20;
export const STACKED_GAP = 6;
/** The name line over a stacked run, and the column's gap under it. */
export const STACKED_NAME_LINE = 20;
export const STACKED_NAME_GAP = 4;
/**
 * The gap between the parts of a bubble's column (`gap-0.5`): a line that
 * opens under the bubble takes it in (see `Appearing`).
 */
export const BUBBLE_COLUMN_GAP = 2;

/** How the list shows its rows, for their headers. */
export interface HeaderContext {
  readonly layout: MessageLayout;
  readonly self: string;
  /** Group chats, where incoming runs show their sender's name. */
  readonly showAuthors: boolean;
}

/** A stacked row's header: a reply's card leaves the space above it. */
export function stackedHeader(startsGroup: boolean, card: boolean) {
  const gap = card || !startsGroup ? STACKED_GAP : STACKED_RUN_GAP;
  return gap + (startsGroup ? STACKED_NAME_LINE + STACKED_NAME_GAP : 0);
}

/** A bubble row's header, with the sender's name when it shows one. */
export function bubbleHeader(startsGroup: boolean, named: boolean) {
  const { gap, nameGap, nameLine, runGap } = BUBBLE_HEADER;
  return (startsGroup ? runGap : gap) + (named ? nameLine + nameGap : 0);
}

/** The height of a row's header (0 for rows that aren't messages). */
export function headerHeight(row: MessageRow, context: HeaderContext) {
  if (row.type !== "message") return 0;
  const { message, startsGroup } = row;
  if (context.layout === "stacked") {
    return stackedHeader(startsGroup, message.quote !== undefined);
  }
  const named =
    startsGroup && context.showAuthors && message.authorId !== context.self;
  return bubbleHeader(startsGroup, named);
}
