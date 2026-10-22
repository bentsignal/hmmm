import type { ReactNode } from "react";
import type { View } from "react-native";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import { Platform } from "react-native";
import Animated, {
  Easing,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

import { GlassSurface } from "~/components/glass-surface";

/** How long the glass takes to ease down to a shorter field. */
const SETTLE_MS = 250;
/** The messages' own easing (`GROW_EASING`), as a function to call. */
const SETTLE_EASING = Easing.bezierFn(0.25, 0.1, 0.25, 1);
/** Frames to wait for the field to get shorter before letting the glass go. */
const WAIT_FRAMES = 30;

/**
 * Holds the glass at the field's height until the field gets shorter, then
 * eases it down to the field, its bottom staying put. The glass follows the
 * field the whole way, as when attachments close as it eases. If the field
 * doesn't get shorter, the glass lets go.
 */
function settle(
  field: AnimatedRef<View>,
  held: SharedValue<number>,
  sends: SharedValue<number>,
) {
  "worklet";
  // A later send takes the glass over.
  const send = sends.get() + 1;
  sends.set(send);
  const before = measure(field);
  if (before === null) return;
  const from = before.height;
  held.set(from);
  let waited = 0;
  let lost = 0;
  let start: number | undefined;
  function frame(time: number) {
    if (sends.get() !== send) return;
    const now = measure(field)?.height ?? from;
    if (start === undefined) {
      if (now < from - 0.5) {
        start = time;
        lost = from - now;
      } else {
        waited += 1;
        if (waited < WAIT_FRAMES) requestAnimationFrame(frame);
        else held.set(0);
        return;
      }
    }
    const progress = Math.min((time - start) / SETTLE_MS, 1);
    if (progress === 1) {
      held.set(0);
      return;
    }
    held.set(now + lost * (1 - SETTLE_EASING(progress)));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * What `GlassField` needs, and `settle`, to call just before sending empties
 * the field: rather than jumping down to the shorter field, the glass eases
 * down to it.
 */
export function useFieldGlass() {
  /** The field, measured as it changes. */
  const field = useAnimatedRef<View>();
  /** The least height the glass is drawn at, while it eases down. */
  const held = useSharedValue(0);
  const sends = useSharedValue(0);
  return {
    field,
    held,
    // Android's bar is solid, with a border along its top that moves at
    // once: glass held above it would show over the messages.
    settle: () => {
      if (Platform.OS === "ios") scheduleOnUI(settle, field, held, sends);
    },
  };
}

/**
 * The message field: its glass, and what's in it on top. What's in it is
 * already where it ends up as the glass eases down, so it never moves.
 */
export function GlassField({
  field,
  held,
  minHeight,
  children,
}: Omit<ReturnType<typeof useFieldGlass>, "settle"> & {
  minHeight: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    // eslint-disable-next-line vera/no-layout-animation -- Only for a moment after sending, and only this glass, drawn behind the field: nothing else changes size or moves.
    minHeight: held.get(),
  }));
  return (
    <Animated.View
      ref={field}
      className="flex-1 justify-center"
      style={{ minHeight }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            bottom: 0,
            height: "100%",
            left: 0,
            position: "absolute",
            right: 0,
          },
          style,
        ]}
      >
        <GlassSurface className="flex-1 rounded-[20px]" />
      </Animated.View>
      {children}
    </Animated.View>
  );
}
