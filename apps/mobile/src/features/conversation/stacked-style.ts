import { useSyncExternalStore } from "react";

// Development only: variations on stacked rows to flip through in a
// conversation (see `StackedStylePicker`), so Shawn can pick what reads
// most clearly. The first is what ships; the rest build on the thread pill
// and change how strongly each piece of text stands out.

/** How a thread's count looks under a stacked row. */
type ThreadLook = "blue-pill" | "bold-pill" | "link" | "outline-pill" | "pill";

/** How a stacked conversation draws its rows. */
export interface StackedStyle {
  readonly name: string;
  /** What it changes, under the name in the picker. */
  readonly note: string;
  /** The sender's name: today's semibold, or bold. */
  readonly boldNames: boolean;
  /** The sender's name: the text's color, or one of its own per person. */
  readonly nameColor: "foreground" | "person";
  /** The message text: full strength, or a shade softer than the name. */
  readonly softText: boolean;
  /** The time beside the name: gray, or fainter. */
  readonly faintTime: boolean;
  /** The message text's line height, or the font's own. */
  readonly lineHeight?: number;
  /** A thread's count: today's blue text, or a pill. */
  readonly thread: ThreadLook;
}

const CURRENT = {
  boldNames: false,
  faintTime: false,
  lineHeight: undefined,
  name: "Current",
  nameColor: "foreground",
  note: "What ships today",
  softText: false,
  thread: "link",
} satisfies StackedStyle;

const PILL = {
  ...CURRENT,
  name: "Thread pill",
  note: "A thread's replies as a button",
  thread: "pill",
} satisfies StackedStyle;

const NAMES_FIRST = {
  ...PILL,
  boldNames: true,
  faintTime: true,
  softText: true,
} satisfies StackedStyle;

export const STACKED_STYLES = [
  CURRENT,
  PILL,
  { ...PILL, boldNames: true, name: "Bold names", note: "Pill, names in bold" },
  {
    ...PILL,
    name: "Soft text",
    note: "Pill, message text a shade softer than names",
    softText: true,
  },
  {
    ...PILL,
    faintTime: true,
    name: "Faint times",
    note: "Pill, times fainter beside the name",
  },
  {
    ...PILL,
    name: "Colored names",
    nameColor: "person",
    note: "Pill, each person's name in their own color",
  },
  {
    ...PILL,
    name: "Blue pill",
    note: "The pill tinted blue, with blue text",
    thread: "blue-pill",
  },
  {
    ...PILL,
    name: "Bold pill",
    note: "The pill bigger, its text bold",
    thread: "bold-pill",
  },
  {
    ...PILL,
    name: "Outlined pill",
    note: "The pill as an outline",
    thread: "outline-pill",
  },
  {
    ...NAMES_FIRST,
    name: "Names first",
    note: "Bold names, softer text, fainter times",
  },
  {
    ...NAMES_FIRST,
    name: "Names first, blue pill",
    note: "Names first, with the blue pill",
    thread: "blue-pill",
  },
  {
    ...NAMES_FIRST,
    name: "Names first, bold pill",
    note: "Names first, with the bold pill",
    thread: "bold-pill",
  },
  {
    ...NAMES_FIRST,
    name: "Colors first",
    nameColor: "person",
    note: "Colored bold names, softer text, fainter times",
  },
  {
    ...NAMES_FIRST,
    lineHeight: 22,
    name: "Names first, taller lines",
    note: "Names first, blue pill, more space between lines",
    thread: "blue-pill",
  },
] satisfies readonly StackedStyle[];

/** The pill's background, text, and arrow, for each pill look. */
export const PILL_LOOKS = {
  "blue-pill": {
    arrow: "accent-accent",
    box: "bg-accent/15 py-1",
    text: "text-footnote text-accent font-semibold",
  },
  "bold-pill": {
    arrow: "accent-foreground",
    box: "bg-fill py-1.5",
    text: "text-subhead text-foreground font-bold",
  },
  "outline-pill": {
    arrow: "accent-muted",
    box: "border-separator border py-1",
    text: "text-footnote text-foreground font-semibold",
  },
  pill: {
    arrow: "accent-muted",
    box: "bg-fill py-1",
    text: "text-footnote text-foreground font-semibold",
  },
};

// iOS's system colors, in their high-contrast shades, so a name reads on
// either background.
const PERSON_COLORS = {
  dark: [
    "#ff6961",
    "#ffb340",
    "#30db5b",
    "#70d7ff",
    "#409cff",
    "#7d7aff",
    "#da8fff",
    "#ff6482",
  ],
  light: [
    "#d70015",
    "#c93400",
    "#248a3d",
    "#0071a4",
    "#0040dd",
    "#3634a3",
    "#8944ab",
    "#d30f45",
  ],
};

/** The same color for a person every time, from their address. */
export function personColor(address: string, theme: string) {
  let hash = 0;
  for (const char of address) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const colors = theme === "dark" ? PERSON_COLORS.dark : PERSON_COLORS.light;
  return colors[hash % colors.length];
}

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
