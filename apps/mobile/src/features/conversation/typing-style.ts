import { useSyncExternalStore } from "react";

// Development only: ways for the typing indicator to meet the messages it
// becomes, to flip through in a conversation (see `TypingStylePicker`) so
// Shawn can pick what holds up in a busy group. The first is what ships.

/** How the typing indicator shows, and what a typist's message does to it. */
export interface TypingStyle {
  readonly name: string;
  /** What it does, under the name in the picker. */
  readonly note: string;
  /** Under the newest message, or in a chip under the header. */
  readonly place: "header" | "list";
  /**
   * What a typist's message does to it: it becomes the message, it stays
   * under the newest message as the message slots in above it, or it gets
   * out of the way until the message has landed.
   */
  readonly onSend: "becomes" | "stays" | "stepsAside";
  /** Its space is always kept, so typing never moves the list. */
  readonly reserved: boolean;
}

export const TYPING_STYLES = [
  {
    name: "Becomes the message",
    note: "Crossfades into the message, shows again for the rest",
    onSend: "becomes",
    place: "list",
    reserved: false,
  },
  {
    name: "Stays last",
    note: "Messages slot in above it, like iMessage",
    onSend: "stays",
    place: "list",
    reserved: false,
  },
  {
    name: "Steps aside",
    note: "Leaves as a message lands, back once it settles",
    onSend: "stepsAside",
    place: "list",
    reserved: false,
  },
  {
    name: "Room kept",
    note: "Its space is always there; typing never moves the list",
    onSend: "stays",
    place: "list",
    reserved: true,
  },
  {
    name: "In the header",
    note: "A chip under the name; the list never moves",
    onSend: "stays",
    place: "header",
    reserved: false,
  },
] as const satisfies readonly TypingStyle[];

const [FIRST] = TYPING_STYLES;

let index = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Moves to the next style (`by` 1) or the one before (-1), wrapping. */
export function stepTypingStyle(by: number) {
  index = (index + by + TYPING_STYLES.length) % TYPING_STYLES.length;
  for (const listener of listeners) listener();
}

export function useTypingStyleIndex() {
  return useSyncExternalStore(subscribe, () => index);
}

/** The style to draw: the picked one in development, the first otherwise. */
export function useTypingStyle() {
  const picked = useTypingStyleIndex();
  return (__DEV__ ? TYPING_STYLES[picked] : undefined) ?? FIRST;
}
