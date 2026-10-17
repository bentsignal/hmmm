import type { ReactNode } from "react";
import { useId } from "react";
import { Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { LiftMode } from "./row-touch";
import type { Message } from "./types";
import { impact, selectionTick } from "~/lib/native-extras";
import { wasLinkTap } from "./link-tap";
import { LONG_PRESS_MS, useMessageActions } from "./message-actions";
import {
  liftRow,
  MenuPressContext,
  reportTouch,
  rowGestureBegan,
  RowIdContext,
  touchedPart,
} from "./row-touch";

/**
 * Two taps this close together are a double tap. A single tap waits this
 * long to be sure it isn't one.
 */
const DOUBLE_TAP_MS = 200;
/** A tap moving further than this is a drag (to reveal times), not a tap. */
const TAP_SLOP = 10;

/** Lifts what the row lifts (see `useRowTarget`), with its haptic. */
function liftWhole(row: string, mode: LiftMode) {
  if (mode === "actions") impact();
  else selectionTick();
  liftRow(row, mode);
}

/**
 * A message's row, across the screen and from the top of the sender's name
 * to the bottom of the message, which takes its taps, double taps, and
 * holds wherever they land: a tap opens the message's thread in a
 * conversation, a double tap lifts it with who reacted, and a hold lifts
 * it with its actions. On a part with its own menu (`MenuTargetView`), a
 * double tap lifts just that part, and a hold is the part's own. Parts
 * that are buttons of their own (a photo, a link card, the thread's count,
 * a reaction) keep their touches to themselves.
 *
 * The taps are native recognizers, since a Pressable drops the second of
 * two quick taps. They see every touch in the row; the Pressables say
 * where it landed, the row's own only when no part's took it. A single
 * tap fires once a double tap can no longer begin.
 */
export function MessageRowTarget({
  message,
  children,
}: {
  message: Message;
  children: ReactNode;
}) {
  const { openThread } = useMessageActions();
  const row = useId();
  // A message still sending (or that failed) has no menu or thread yet.
  const holdable = message.status === undefined;
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(DOUBLE_TAP_MS)
    .runOnJS(true)
    .onBegin(rowGestureBegan)
    .onEnd((_, success) => {
      const part = touchedPart();
      if (!success || part === null) return;
      if (part !== "row") part.openReactions();
      else if (holdable) liftWhole(row, "reactions");
    });
  const singleTap = Gesture.Tap()
    // A hold opens the menu instead.
    .maxDuration(LONG_PRESS_MS)
    .maxDistance(TAP_SLOP)
    .enabled(openThread !== undefined && holdable)
    .runOnJS(true)
    .onBegin(rowGestureBegan)
    .onEnd((_, success) => {
      if (!success || touchedPart() === null || wasLinkTap()) return;
      openThread?.(message);
    });
  const press = {
    delayLongPress: LONG_PRESS_MS,
    onLongPress: () => {
      if (holdable) liftWhole(row, "actions");
    },
    onPressIn: () => reportTouch("row"),
    onPressOut: () => undefined,
  };
  return (
    <RowIdContext value={row}>
      <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap)}>
        <Pressable
          // Not one element to VoiceOver: the message's parts keep their
          // own, and the thread's count and quote are its buttons.
          accessible={false}
          {...press}
        >
          {/* Links in text that isn't a part of its own hold the row. */}
          <MenuPressContext value={press}>{children}</MenuPressContext>
        </Pressable>
      </GestureDetector>
    </RowIdContext>
  );
}
