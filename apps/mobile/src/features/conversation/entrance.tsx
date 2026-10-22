import type { ReactNode } from "react";
import { useState } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { GROW_MS } from "./moves";
import { useOnMount } from "./typing-parts";

// How a part of a row comes in as it mounts, once it's arrived while you
// watch (a reaction added, a line under a message).
//
// Not a layout animation (`entering`): one held up the layout commit the
// part's space was in, while the moves that make room for it went to the
// screen on time, and the rows above jumped for a few frames as a tapback
// came in. Not a CSS animation either: a React commit landing mid-way
// drew it at its final size for a frame. An animated style, which
// Reanimated keeps through other commits, and once it's in, plain styles
// again, so a redraw after Reanimated has let go of its values doesn't put
// the first, hidden ones back (see `useOpened` in arrive.tsx).

const KINDS = {
  /** Fades in. */
  fade: { ms: 220 },
  /** Grows from nothing, a little past its size and back: glass, which can't fade. */
  grow: { ms: 280 },
  /** Pops in as a tapback does: fading in and growing past its size. */
  pop: { ms: 320 },
} as const;

export type EntranceKind = keyof typeof KINDS;

/** How long after it's in that the rows around it are still. */
const SETTLE_MS = GROW_MS;

/** What it looks like `progress` (0 to 1) of the way in. */
function look(kind: EntranceKind, progress: number) {
  "worklet";
  if (kind === "fade") return { opacity: progress };
  if (kind === "grow") {
    return {
      transform: [{ scale: interpolate(progress, [0, 0.6, 1], [0, 1.06, 1]) }],
    };
  }
  return {
    opacity: interpolate(progress, [0, 0.6, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(progress, [0, 0.6, 1], [0.3, 1.12, 1]) }],
  };
}

/**
 * `children`, coming in as `kind` does from the frame they mount; just
 * `children` unless `active` (what came with its row as it scrolled in,
 * see `useArrivedLater`). Whether it's active is settled when it mounts.
 */
export function Entrance({
  kind,
  active = true,
  children,
}: {
  kind: EntranceKind;
  active?: boolean;
  children: ReactNode;
}) {
  if (!active) return children;
  return <Entering kind={kind}>{children}</Entering>;
}

function Entering({
  kind,
  children,
}: {
  kind: EntranceKind;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);
  const [done, setDone] = useState(false);
  // Plain styles again (a React render) once the rows that made room for
  // it have stopped moving: a commit of React's while they move draws
  // them, for a frame, where they were a few frames before.
  function finish() {
    setTimeout(() => setDone(true), SETTLE_MS);
  }
  useOnMount(() => {
    "worklet";
    progress.set(
      withTiming(
        1,
        { duration: KINDS[kind].ms, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished === true) scheduleOnRN(finish);
        },
      ),
    );
  });
  const style = useAnimatedStyle(() => look(kind, progress.get()));
  return (
    <Animated.View style={done ? undefined : style}>{children}</Animated.View>
  );
}
