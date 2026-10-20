import type { SharedValue } from "react-native-reanimated";
import { useState } from "react";
import { Platform } from "react-native";
import { useSharedValue } from "react-native-reanimated";

/** The floating composer's height, as the conversation's list uses it. */
export interface ComposerHeight {
  /** Every height it reports, for the list to follow on the UI thread. */
  live: SharedValue<number>;
  /**
   * Its height in React, undefined until it's laid out (the list waits for
   * it). On iOS that's its first height only; on Android every change,
   * since the list makes room for it in a row (see `useLatest`).
   */
  laidOut: number | undefined;
}

/**
 * The composer's height (`ComposerHeight`) and the `onHeight` that reports
 * it. On iOS a change after the first reaches only the UI thread: as React
 * state it re-rendered the whole conversation, about 250 ms of JavaScript
 * each time, three times as attachments opened or closed, and the list
 * could only catch up after each.
 */
export function useComposerHeight() {
  const live = useSharedValue(0);
  const [laidOut, setLaidOut] = useState<number>();
  return {
    composerHeight: { laidOut, live },
    onHeight: (height: number) => {
      live.set(height);
      if (Platform.OS !== "ios" || laidOut === undefined) setLaidOut(height);
    },
  };
}
