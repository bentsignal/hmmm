import { useSyncExternalStore } from "react";

// Development only: variations on stacked rows to flip through in a
// conversation (see `StackedStylePicker`), so Shawn can pick what reads
// most clearly. The first is what ships; the rest change a few knobs each.

/** How a stacked conversation draws its rows. */
export interface StackedStyle {
  readonly name: string;
  /** What it changes, under the name in the picker. */
  readonly note: string;
  /** Space above a sender's first message (and a reply). */
  readonly groupGap: number;
  /** Space between one sender's messages. */
  readonly messageGap: number;
  /** The message text's line height, or the font's own. */
  readonly lineHeight?: number;
  /** The sender's name: today's subhead, or body size. */
  readonly bigNames: boolean;
  /** The sender's photo: 36pt, or 40pt. */
  readonly bigAvatar: boolean;
  /** A hairline above each sender's group, under the photo column. */
  readonly divider: boolean;
  /** Each sender's group on a faint rounded card. */
  readonly card: boolean;
  /** Reactions: glass chips, or small flat ones. */
  readonly chips: "flat" | "glass";
  /** A thread's count: accent text, muted text, or a filled pill. */
  readonly threadLink: "accent" | "muted" | "pill";
  /**
   * What a reply answers: the curve and line above the photo, or a
   * quoted block under the name, inside the message.
   */
  readonly quote: "block" | "curve";
}

const CURRENT = {
  bigAvatar: false,
  bigNames: false,
  card: false,
  chips: "glass",
  divider: false,
  groupGap: 20,
  lineHeight: undefined,
  messageGap: 6,
  name: "Current",
  note: "What ships today",
  quote: "curve",
  threadLink: "accent",
} satisfies StackedStyle;

export const STACKED_STYLES = [
  CURRENT,
  {
    ...CURRENT,
    groupGap: 32,
    lineHeight: 23,
    messageGap: 10,
    name: "More room",
    note: "Taller lines, more space between messages and senders",
  },
  {
    ...CURRENT,
    divider: true,
    groupGap: 28,
    lineHeight: 22,
    name: "Rules",
    note: "A hairline above each sender",
  },
  {
    ...CURRENT,
    chips: "flat",
    name: "Quiet extras",
    note: "Flat reactions, gray reply counts",
    threadLink: "muted",
  },
  {
    ...CURRENT,
    name: "Quote inside",
    note: "What a reply answers sits under the name",
    quote: "block",
  },
  {
    ...CURRENT,
    name: "Thread pill",
    note: "A thread's replies as a button",
    threadLink: "pill",
  },
  {
    ...CURRENT,
    bigAvatar: true,
    bigNames: true,
    groupGap: 26,
    lineHeight: 22,
    name: "Strong names",
    note: "Bigger names and photos",
  },
  {
    ...CURRENT,
    card: true,
    chips: "flat",
    groupGap: 10,
    lineHeight: 22,
    name: "Cards",
    note: "Each sender's run on a card",
  },
  {
    ...CURRENT,
    chips: "flat",
    groupGap: 30,
    lineHeight: 23,
    messageGap: 8,
    name: "Mix",
    note: "More room, quiet extras, quote inside, thread pill",
    quote: "block",
    threadLink: "pill",
  },
  {
    ...CURRENT,
    chips: "flat",
    divider: true,
    groupGap: 28,
    lineHeight: 23,
    messageGap: 8,
    name: "Mix + rules",
    note: "The mix, with a hairline above each sender",
    quote: "block",
    threadLink: "muted",
  },
] satisfies readonly StackedStyle[];

// In memory: it survives hot reloads, and a full reload starts over.
let index = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Moves `by` styles along, wrapping around. */
export function stepStackedStyle(by: number) {
  const count = STACKED_STYLES.length;
  index = (((index + by) % count) + count) % count;
  for (const listener of listeners) listener();
}

export function useStackedStyleIndex() {
  return useSyncExternalStore(subscribe, () => index);
}

/** The style stacked rows draw with (always the first outside development). */
export function useStackedStyle() {
  return STACKED_STYLES[useStackedStyleIndex()] ?? CURRENT;
}
