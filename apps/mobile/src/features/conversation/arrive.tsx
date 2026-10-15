import type { ReactNode } from "react";
import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";

/**
 * How a message that comes in while the conversation is open appears: it
 * fades in as the list slides it into view (see `useLatest`). Opacity only,
 * so it runs on the UI thread with no layout: nothing is clipped, and
 * there's no edge it rises from.
 */
const FADE = FadeIn.duration(280);

/**
 * Rows that already played their arrival, so a row that scrolls out of the
 * list's window and back doesn't play it again.
 */
const arrived = new Set<string>();

/** A row that came in while the conversation is open: it fades in, once. */
export function Arrive({
  rowKey,
  children,
}: {
  /** The row's key, so it arrives once. */
  rowKey: string;
  children: ReactNode;
}) {
  const [first] = useState(() => !arrived.has(rowKey));
  arrived.add(rowKey);
  return (
    <Animated.View entering={first ? FADE : undefined}>
      {children}
    </Animated.View>
  );
}
