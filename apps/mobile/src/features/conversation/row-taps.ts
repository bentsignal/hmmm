import { Gesture } from "react-native-gesture-handler";

import { impact } from "~/lib/native-extras";
import { wasLinkTap } from "./link-tap";
import { rowGestureBegan, rowTarget, touchedRow } from "./row-touch";
import { LONG_PRESS_MS } from "./squeeze";

/**
 * Two taps this close together are a double tap. A single tap waits this
 * long to be sure it isn't one.
 */
const DOUBLE_TAP_MS = 200;
/** A tap moving further than this is a drag (to reveal times), not a tap. */
const TAP_SLOP = 10;

/**
 * Opens the menu over what the row lifts at the touch's height `y` on
 * screen (see `useRowTarget`).
 */
export function openRowMenu(row: string, y: number) {
  const target = rowTarget(row);
  if (target === undefined) return;
  impact();
  target.release();
  target.lift(y);
}

/**
 * The taps on the list's message rows (see `MessageRowTarget`): a tap
 * opens a message's thread in a conversation, and a double tap lifts it
 * with its menu, as a hold does. On a part with its own menu
 * (`MenuTargetView`), a double tap lifts just that part.
 *
 * One pair of native recognizers for the whole list, since a Pressable
 * drops the second of two quick taps; a pair in every row cost each row
 * as it mounted. They see every touch in the list; the rows' Pressables
 * say which row and part it landed on, and touches anywhere else do
 * nothing. A single tap fires once a double tap can no longer begin.
 */
export function rowTaps(
  /** A tap opens a message's thread (in a conversation, not a thread). */
  opensThreads: boolean,
) {
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(DOUBLE_TAP_MS)
    .runOnJS(true)
    .onBegin(rowGestureBegan)
    .onEnd((event, success) => {
      const touched = touchedRow(event.absoluteY);
      if (!success || touched === null) return;
      if (touched.part !== "row") touched.part.openMenu();
      else if (touched.holdable) openRowMenu(touched.row, event.absoluteY);
    });
  const singleTap = Gesture.Tap()
    // A hold opens the menu instead.
    .maxDuration(LONG_PRESS_MS)
    .maxDistance(TAP_SLOP)
    .enabled(opensThreads)
    .runOnJS(true)
    .onBegin(rowGestureBegan)
    .onEnd((event, success) => {
      const touched = touchedRow(event.absoluteY);
      if (!success || touched === null || wasLinkTap()) return;
      touched.openThread?.();
    });
  return Gesture.Exclusive(doubleTap, singleTap);
}
