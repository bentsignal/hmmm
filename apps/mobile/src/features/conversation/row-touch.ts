import { createContext, use, useImperativeHandle } from "react";

import type { MenuTarget } from "./glass-message-menu";
import type { useMenuTarget } from "./message-actions";

/** The actions (a hold) or who reacted (a double tap). */
export type LiftMode = MenuTarget["mode"];

/** What a touch on a message's row landed on: the row, or a part's text. */
export type TouchedPart = "row" | { readonly openReactions: () => void };

/**
 * Where the latest touch landed, as the row or a part with its own menu
 * reports it, and when the row's gesture seeing it began. One touch lands
 * at a time, so they're kept for every row at once.
 */
let touch: { at: number; part: TouchedPart } | undefined;
let gestureBegan = 0;

/**
 * A touch's report counts for the gesture that began up to this long after
 * it: the touch reaches the gesture and the Pressables separately, and the
 * JavaScript thread can be busy between them. Two touches are never this
 * close.
 */
const REPORT_SLACK_MS = 250;

/** Says the latest touch landed on the row, or on a part with a menu. */
export function reportTouch(part: TouchedPart) {
  touch = { at: Date.now(), part };
}

/** Marks a row's gesture beginning, for a new touch. */
export function rowGestureBegan() {
  gestureBegan = Date.now();
}

/**
 * What the row gesture's touch landed on: the row, a part with a menu, or
 * null for something with a press of its own (a photo, a reaction).
 */
export function touchedPart() {
  if (touch === undefined || touch.at < gestureBegan - REPORT_SLACK_MS) {
    return null;
  }
  return touch.part;
}

/** What a hold or double tap beside a message's parts lifts. */
interface RowTarget {
  readonly lift: (mode: LiftMode) => void;
}

/** What each message row lifts, by the row's ID (see `useRowTarget`). */
const rowTargets = new Map<string, RowTarget>();

/** The message row around, by its ID. */
export const RowIdContext = createContext<string | null>(null);

/**
 * Makes `lift` what a hold or double tap across the message's row lifts:
 * the whole message for a bubble, the whole row for a stacked message.
 * Leaves it be when undefined.
 */
export function useRowTarget(lift: ((mode: LiftMode) => void) | undefined) {
  const id = use(RowIdContext);
  useImperativeHandle(
    lift === undefined || id === null
      ? null
      : (target: RowTarget | null) => {
          if (target === null) rowTargets.delete(id);
          else rowTargets.set(id, target);
        },
    () => ({ lift: (mode: LiftMode) => lift?.(mode) }),
  );
}

/** Lifts what the row `id` lifts (see `useRowTarget`). */
export function liftRow(id: string, mode: LiftMode) {
  rowTargets.get(id)?.lift(mode);
}

export type MenuPress = NonNullable<ReturnType<typeof useMenuTarget>>["press"];

/** A part's hold, which pressables inside it take on (see `useMenuPress`). */
export const MenuPressContext = createContext<MenuPress | null>(null);

/**
 * The hold of the part around it, for a pressable inside it (a link in a
 * message's text), which would otherwise take the hold from the part.
 * Null in the lifted copy.
 */
export function useMenuPress() {
  return use(MenuPressContext);
}
