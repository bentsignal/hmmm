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
 * pieces of the row itself above the space, see `usePieceLift`), and
 * nothing below it.
 */
interface Growth {
  /** The growing row's order (see `rowOrder`). */
  readonly pivot: SharedValue<number>;
  /** Where in that row the space is (see `Place`). */
  readonly place: SharedValue<number>;
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
  const place = useSharedValue(0);
  const offset = useSharedValue(0);
  return (
    <GrowthContext value={{ list, offset, pivot, place }}>
      {children}
    </GrowthContext>
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
  { order, place, measured }: Omit<SpaceProps, "animate" | "height">,
  delta: number,
) {
  "worklet";
  const row = measure(measured);
  const list = measure(growth.list);
  if (row === null || list === null) return;
  if (row.pageY + row.height > list.pageY + list.height + 1) return;
  // The same row again mid-move (its space measured again) adds to it.
  const carried = growth.pivot.get() === order ? growth.offset.get() : 0;
  growth.pivot.set(order);
  growth.place.set(place);
  growth.offset.set(carried + delta);
  growth.offset.set(withTiming(0, { duration: GROW_MS, easing: GROW_EASING }));
}

/** Above every row: the space that changed is under the newest message. */
const UNDER_NEWEST = Number.MAX_VALUE;

/**
 * Draws every row `delta` from where it's laid out, then eases it into
 * place: for space under the newest message that changed at once, when
 * the list couldn't keep what's on screen still.
 */
export function useLiftAll() {
  const growth = useGrowth();
  return (delta: number) => {
    "worklet";
    const carried =
      growth.pivot.get() === UNDER_NEWEST ? growth.offset.get() : 0;
    growth.pivot.set(UNDER_NEWEST);
    growth.offset.set(carried + delta);
    growth.offset.set(
      withTiming(0, { duration: GROW_MS, easing: GROW_EASING }),
    );
  };
}

/** What's under the newest message, moving with `useLiftAll`'s rows. */
export function useUnderNewestLift() {
  const { pivot, offset } = useGrowth();
  return useAnimatedStyle(() => ({
    transform: [
      { translateY: pivot.get() === UNDER_NEWEST ? offset.get() : 0 },
    ],
  }));
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
 * A piece of the growing row at `place` (see `Place`). In a row that stays
 * where it is (bubbles), a piece above the space moves up with the rows
 * above. In one that moves with them (stacked rows, `rowMoves`), a piece
 * below the space stays put.
 */
export function usePieceLift(order: number, place: number, rowMoves = false) {
  const growth = useGrowth();
  return useAnimatedStyle(() => {
    const growing = growth.pivot.get() === order;
    const above = growth.place.get() > place;
    let translateY = 0;
    if (growing && above && !rowMoves) translateY = growth.offset.get();
    if (growing && !above && rowMoves) translateY = -growth.offset.get();
    return { transform: [{ translateY }] };
  });
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
  /** Where in the row the space is (see `Place`). */
  place: number;
  animate: boolean;
  /** The message, measured to tell whether it's on screen. */
  measured: AnimatedRef<View>;
}

function Space({ height, order, place, animate, measured }: SpaceProps) {
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
      if (animate) lift(growth, { measured, order, place }, delta);
    },
    [height, animate, order, place],
  );
  // eslint-disable-next-line vera/no-layout-animation -- Not animated: the height changes once, in the same frame as the lift, which does the moving.
  const style = useAnimatedStyle(() => ({ height: space.get() }));
  return <Animated.View style={style} />;
}
