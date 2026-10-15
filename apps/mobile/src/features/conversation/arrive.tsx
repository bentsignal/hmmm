import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** How long a new message takes to make room for itself and float in. */
const ARRIVE_MS = 320;
const EASE = Easing.out(Easing.cubic);
/** How far below its place a new message starts. */
const RISE = 18;

/**
 * Rows that already played their arrival, so a row that scrolls out of the
 * list's window and back doesn't play it again.
 */
const arrived = new Set<string>();

/**
 * A message (or header) that arrives while the conversation is open, as in
 * Messages: its space opens smoothly at the bottom, so the conversation
 * glides up to make room instead of jumping, and the message floats up into
 * that space as it fades in. The list stays at the bottom while it does
 * (see `useLatest`), so the motion is all here.
 *
 * Once it's in place it's an ordinary row: its height follows its content
 * again (a reaction arriving later), and nothing is clipped.
 */
export function Arrive({
  rowKey,
  children,
}: {
  /** The row's key, so it arrives once. */
  rowKey: string;
  children: ReactNode;
}) {
  const [settled, setSettled] = useState(() => arrived.has(rowKey));
  const height = useSharedValue(0);
  const progress = useSharedValue(0);
  // The same views throughout, so the message never remounts: only how
  // they're laid out changes once it's in place.
  // Settled values are spelled out: an animated style keeps whatever it
  // last set for a key it stops returning.
  const space = useAnimatedStyle(() =>
    settled
      ? { height: "auto" as const, overflow: "visible" as const }
      : { height: height.value, overflow: "hidden" as const },
  );
  const content = useAnimatedStyle(() => ({
    left: 0,
    opacity: settled ? 1 : progress.value,
    position: settled ? ("relative" as const) : ("absolute" as const),
    right: 0,
    top: 0,
    transform: [{ translateY: settled ? 0 : (1 - progress.value) * RISE }],
  }));

  function settle() {
    arrived.add(rowKey);
    setSettled(true);
  }

  return (
    <Animated.View style={space}>
      <Animated.View style={content}>
        <View
          onLayout={(event) => {
            if (settled || progress.value > 0) return;
            height.set(
              withTiming(event.nativeEvent.layout.height, {
                duration: ARRIVE_MS,
                easing: EASE,
              }),
            );
            progress.set(
              withTiming(1, { duration: ARRIVE_MS, easing: EASE }, (done) => {
                if (done === true) scheduleOnRN(settle);
              }),
            );
          }}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
