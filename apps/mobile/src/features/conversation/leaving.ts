import { useState } from "react";
import {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { GROW_MS } from "./moves";

// The last of a part's reactions going away: they stay mounted while they
// go out, then let go (see `useLeaving`).

/** How long they take to go out, as their space closes. */
const LEAVE_MS = 160;
/**
 * They're let go of (a React render) only once the rows have stopped
 * moving: a commit of React's while they move draws them, for a frame,
 * where they were a few frames before.
 */
const LET_GO_MS = GROW_MS + 120;

const LOOKS = {
  /** Fades out: glass chips, which can't shrink without their glass showing. */
  fade: (shown: number) => {
    "worklet";
    return { opacity: shown };
  },
  /** Shrinks as it fades: tapbacks. */
  shrink: (shown: number) => {
    "worklet";
    return {
      opacity: shown,
      transform: [{ scale: interpolate(shown, [0, 1], [0.4, 1]) }],
    };
  },
} as const;

/**
 * Whether what was `showing` is going out now that it's taken back, with
 * what it last showed (`value`), and its style as it goes. It goes out in
 * place, moving with the message as its space closes; then `leaving` is
 * false and it can unmount.
 *
 * Not a layout animation (`exiting`): one kept Reanimated from committing
 * while it ran, so the moves that close the space went to the screen
 * ahead of the space itself, and the rows above jumped for a frame or two
 * (see `Entrance`).
 */
export function useLeaving<Value>(
  showing: boolean,
  value: Value,
  look: keyof typeof LOOKS,
) {
  const [last, setLast] = useState(value);
  if (showing && value !== last) setLast(value);
  const [leaving, setLeaving] = useState(false);
  const [wasShowing, setWasShowing] = useState(showing);
  if (showing !== wasShowing) {
    setWasShowing(showing);
    setLeaving(!showing);
  }
  const shown = useSharedValue(1);
  useAnimatedReaction(
    () => leaving,
    (now, before) => {
      if (now === before) return;
      if (!now) {
        shown.set(1);
        return;
      }
      shown.set(
        withSequence(
          withTiming(0, { duration: LEAVE_MS }),
          withTiming(0, { duration: LET_GO_MS - LEAVE_MS }, (finished) => {
            if (finished === true) scheduleOnRN(setLeaving, false);
          }),
        ),
      );
    },
    [leaving],
  );
  const style = useAnimatedStyle(() => LOOKS[look](shown.get()));
  return { leaving, style, value: showing ? value : last };
}

/** How what's leaving looks as it goes (see `useLeaving`). */
export type LeavingStyle = ReturnType<typeof useLeaving>["style"];
