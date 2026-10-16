import type { ReactNode } from "react";
import type { View } from "react-native";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import Animated, {
  Easing,
  measure,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** How long the messages take to move when a row's space opens or closes. */
const GROW_MS = 260;
const GROW_EASING = Easing.out(Easing.cubic);

/**
 * A row that gains or loses space (its first reaction arrives, or its last
 * goes) changes the list's layout once, at full size. Animating the space's
 * height instead re-lays out every row in the list each frame, which ran at
 * 30fps. In that same frame, everything the change moved is drawn back
 * where it was (a transform, which takes no layout) and eases into place.
 *
 * What moves: in an inverted list kept still from the bottom, a row that
 * grows pushes everything above its new space up (older rows, and the
 * parts of the row itself above the space), and nothing below it.
 */
interface Growth {
  /** The growing row's order (see `rowOrder`). */
  readonly pivot: SharedValue<number>;
  /** How far what moved is drawn from where it's laid out. */
  readonly offset: SharedValue<number>;
  /** The list, to tell whether a row is on screen. */
  readonly list: AnimatedRef<View>;
}

const GrowthContext = createContext<Growth | null>(null);

function useGrowth() {
  const growth = use(GrowthContext);
  if (growth === null) {
    throw new Error("Rows that grow must render inside GrowthProvider");
  }
  return growth;
}

/** No row is growing: no order is below it. */
const NONE = -1;

/** The list whose rows grow; `list` is the view it fills. */
export function GrowthProvider({
  list,
  children,
}: {
  list: AnimatedRef<View>;
  children: ReactNode;
}) {
  const pivot = useSharedValue(NONE);
  const offset = useSharedValue(0);
  return (
    <GrowthContext value={{ list, offset, pivot }}>{children}</GrowthContext>
  );
}

/**
 * Draws `measured`'s row as before its space changed by `delta`, then eases
 * it into place. A row below the bottom of the screen is left alone: the
 * list's scroll anchor keeps what's on screen still then, and moves
 * nothing.
 */
function lift(
  growth: Growth,
  order: number,
  delta: number,
  measured: AnimatedRef<View>,
) {
  "worklet";
  const row = measure(measured);
  const list = measure(growth.list);
  if (row === null || list === null) return;
  if (row.pageY + row.height > list.pageY + list.height + 1) return;
  // The same row again mid-move (its space measured again) adds to it.
  const carried = growth.pivot.get() === order ? growth.offset.get() : 0;
  growth.pivot.set(order);
  growth.offset.set(carried + delta);
  growth.offset.set(withTiming(0, { duration: GROW_MS, easing: GROW_EASING }));
}

/**
 * A row's place while space above it moves: rows older than the growing
 * one, and, when `withOwn`, the growing row itself (stacked rows, whose
 * reactions open below the message).
 */
export function useRowLift(order: number, withOwn: boolean) {
  const { pivot, offset } = useGrowth();
  return useAnimatedStyle(() => {
    const lifted = pivot.get() > order || (withOwn && pivot.get() === order);
    return { transform: [{ translateY: lifted ? offset.get() : 0 }] };
  });
}

/**
 * A part of the growing row above its space (the sender's name over a
 * bubble), which moves with the rows above.
 */
export function useOwnLift(order: number, direction: 1 | -1 = 1) {
  const { pivot, offset } = useGrowth();
  return useAnimatedStyle(() => ({
    transform: [
      {
        translateY: pivot.get() === order ? direction * offset.get() : 0,
      },
    ],
  }));
}

/**
 * Space in a row that opens to `height` (or closes to 0) at once, while the
 * messages it moves ease into place (see `Growth`). With `animate` off it
 * just changes, as for reactions already there when the row appears.
 * Nothing until it first opens, so rows that never need it cost nothing.
 */
export function GrowingSpace(props: SpaceProps) {
  const [used, setUsed] = useState(props.height > 0);
  if (!used && props.height > 0) setUsed(true);
  return used ? <Space {...props} /> : null;
}

interface SpaceProps {
  height: number;
  /** The row's order (see `rowOrder`). */
  order: number;
  animate: boolean;
  /** The message, measured to tell whether it's on screen. */
  measured: AnimatedRef<View>;
}

function Space({ height, order, animate, measured }: SpaceProps) {
  const growth = useGrowth();
  // Opening as it mounts, when what it makes room for arrived while you
  // watched.
  const space = useSharedValue(animate ? 0 : height);
  useAnimatedReaction(
    () => height,
    (now) => {
      const delta = now - space.get();
      if (delta === 0) return;
      space.set(now);
      if (animate) lift(growth, order, delta, measured);
    },
    [height, animate, order],
  );
  // eslint-disable-next-line vera/no-layout-animation -- Not animated: the height changes once, in the same frame as the lift, which does the moving.
  const style = useAnimatedStyle(() => ({ height: space.get() }));
  return <Animated.View style={style} />;
}
