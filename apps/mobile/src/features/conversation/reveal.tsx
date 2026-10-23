import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import { Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { formatTime } from "~/lib/format";
import { rowTaps } from "./row-taps";

/** How far a drag slides your messages over to show times. */
export const REVEAL_WIDTH = 72;

interface Reveal {
  readonly reveal: SharedValue<number>;
  /**
   * A drag or its spring back is going, on the UI thread: until the frame
   * after it settles, so the rows' last transform is exactly 0.
   */
  readonly sliding: SharedValue<boolean>;
  /**
   * A drag is showing times. Rows mount their times only then: one more
   * animated view per row was a good part of what mounting a row cost
   * while scrolling.
   */
  readonly revealing: boolean;
}

const RevealContext = createContext<Reveal | null>(null);

function useReveal() {
  const reveal = use(RevealContext);
  if (reveal === null) {
    throw new Error("Message rows must render inside RevealTimes");
  }
  return reveal;
}

/**
 * iMessage's drag-to-see-times: dragging the conversation left slides your
 * messages over and brings every message's time in from the right edge.
 * Letting go springs everything back. Vertical drags still scroll.
 */
export function RevealTimes({
  opensThreads = false,
  children,
}: {
  /** A tap on a message opens its thread (see `rowTaps`). */
  opensThreads?: boolean;
  children: ReactNode;
}) {
  const reveal = useSharedValue(0);
  const sliding = useSharedValue(false);
  const [revealing, setRevealing] = useState(false);
  const pan = Gesture.Pan()
    .activeOffsetX(-12)
    .failOffsetY([-12, 12])
    .onStart(() => {
      sliding.set(true);
      scheduleOnRN(setRevealing, true);
    })
    .onUpdate((event) => {
      // Stops once the times are fully in view, like iMessage.
      reveal.set(Math.min(REVEAL_WIDTH, Math.max(0, -event.translationX)));
    })
    .onFinalize(() => {
      // Settles back with one small overshoot, not a long wobble, then
      // the times go.
      reveal.set(
        withSpring(0, { damping: 30, stiffness: 320 }, (done) => {
          if (done !== true) return;
          requestAnimationFrame(() => sliding.set(false));
          scheduleOnRN(setRevealing, false);
        }),
      );
    });
  // The rows' taps, which never start once the drag has.
  const taps = rowTaps(opensThreads);
  return (
    <RevealContext value={{ reveal, revealing, sliding }}>
      <GestureDetector gesture={Gesture.Race(pan, taps)}>
        {children}
      </GestureDetector>
    </RevealContext>
  );
}

/** Wraps your own messages so they slide left as times are revealed. */
export function SlideWithReveal({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  // Others' messages don't slide.
  if (!enabled) return children;
  return <Sliding>{children}</Sliding>;
}

function Sliding({ children }: { children: ReactNode }) {
  const { reveal, sliding } = useReveal();
  const style = useAnimatedStyle(() => {
    // Empty at rest, as a row's lift is (see `allStill`).
    if (!sliding.value) return {};
    return { transform: [{ translateX: -reveal.value }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * A message's time, waiting just past the right edge until revealed.
 * `top` skips anything above the bubble, such as the sender's name.
 */
export function RevealedTime({ date, top = 0 }: { date: Date; top?: number }) {
  const { revealing } = useReveal();
  if (!revealing) return null;
  return <Time date={date} top={top} />;
}

function Time({ date, top }: { date: Date; top: number }) {
  const { reveal } = useReveal();
  const time = useAnimatedStyle(() => ({
    opacity: Math.min(1, reveal.value / REVEAL_WIDTH),
    transform: [{ translateX: REVEAL_WIDTH - reveal.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute top-0 right-0 bottom-0 justify-center pr-3"
      style={[{ paddingTop: top, width: REVEAL_WIDTH }, time]}
    >
      <Text className="text-caption text-muted text-right">
        {formatTime(date)}
      </Text>
    </Animated.View>
  );
}
