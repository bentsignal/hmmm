import type { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  makeMutable,
  useAnimatedReaction,
  useAnimatedRef,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { RowLeaving } from "./leave-rows";
import { useClose } from "./grow";

/** How long a deleted message takes to fade before its space closes. */
const FADE_MS = 180;

/**
 * How a row looks as it leaves (see `useRowLift`): its opacity, and once
 * it has closed, the height it keeps (-1 until then).
 */
export interface LeaveState {
  readonly opacity: SharedValue<number>;
  readonly kept: SharedValue<number>;
}

/**
 * A row's, made as it starts leaving: made for every row as it mounted,
 * its two shared values were a good part of what a row cost.
 */
export function useLeaveState(leaving: boolean) {
  const [state, setState] = useState<LeaveState | null>(null);
  if (leaving && state === null) {
    setState({ kept: makeMutable(-1), opacity: makeMutable(1) });
  }
  return state;
}

/**
 * Drives a row's leaving (see `useLeavingRows`), mounted only while it
 * leaves. The row fades where it is and `onFaded` tells the list; once the
 * list has it closing, its space closes in one layout change as what was
 * above it eases down into the gap (see `useClose`), and `onClosed` tells
 * the list again. It keeps `room` of its space for the next row's header,
 * which takes it as this row goes.
 */
export function Leave({
  leaving: { batch, closing, room },
  order,
  state,
  onFaded,
  onClosed,
}: {
  leaving: RowLeaving;
  order: number;
  state: LeaveState;
  onFaded: (batch: number) => void;
  onClosed: (batch: number) => void;
}) {
  const close = useClose();
  // The row, measured: a view across all of it, only while it leaves.
  const measured = useAnimatedRef<View>();
  const { opacity, kept } = state;
  useAnimatedReaction(
    () => batch,
    (now, previous) => {
      if (now === previous) return;
      opacity.set(
        withTiming(0, { duration: FADE_MS }, (finished) => {
          if (finished === true) scheduleOnRN(onFaded, now);
        }),
      );
    },
    [batch],
  );
  useAnimatedReaction(
    () => closing,
    (now, previous) => {
      if (!now || previous === true) return;
      close({ measured, order }, batch, room);
      kept.set(room);
      scheduleOnRN(onClosed, batch);
    },
    [closing, batch, order, room],
  );
  return (
    <Animated.View
      ref={measured}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    />
  );
}
