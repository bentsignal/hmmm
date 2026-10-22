import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useState } from "react";

/**
 * Rows the list mounts per commit beyond the first screen, by what it's
 * doing. A commit's rows mount on the UI thread in one frame: while a
 * finger or its fling moves the list, a few at a time keep its frames on
 * time (eight dropped them, four didn't; see `features/dev/bench`). At
 * rest, messages that come in mount all at once: a few at a time, the
 * ones not mounted yet held their place as blank space, and a busy
 * conversation's batch opened in pieces over each other.
 */
const SCROLLING = 4;
const AT_REST = 24;

/**
 * The list's rows per commit (see `SCROLLING`), and its scroll handlers:
 * `handlers`, and what tells it.
 */
export function useRowsPerCommit(handlers: { onScrollBeginDrag: () => void }) {
  const [scrolling, setScrolling] = useState(false);
  return {
    maxToRenderPerBatch: scrolling ? SCROLLING : AT_REST,
    onMomentumScrollEnd: () => setScrolling(false),
    onScrollBeginDrag: () => {
      handlers.onScrollBeginDrag();
      setScrolling(true);
    },
    // Let go without a fling: no momentum comes to end.
    onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if ((event.nativeEvent.velocity?.y ?? 0) === 0) setScrolling(false);
    },
  };
}
