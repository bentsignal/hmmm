import type { ReactNode } from "react";
import type { View } from "react-native";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import Animated, {
  Easing,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { Blank } from "./blank-space";
import type { LeaveState } from "./leave";
import { Place } from "./row-place";

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
 * nothing below it. In a thread with room under its replies on Android,
 * the room changes with it, so the thread's top stays put and what's
 * below the space moves instead (see `blank`).
 */
interface Growth {
  /** The growing row's order (see `rowOrder`). */
  readonly pivot: SharedValue<number>;
  /** Where in that row the space is (see `Place`). */
  readonly place: SharedValue<number>;
  /** How far what moved above the space is drawn from where it's laid out. */
  readonly offset: SharedValue<number>;
  /** The same below it, which only moves in a thread (see `blank`). */
  readonly below: SharedValue<number>;
  /**
   * A thread's blank space, which Android moves the rows with as it
   * changes: it's updated with the row's size at once, so the rows move
   * once, and the thread's original stays put while its replies move.
   */
  readonly blank?: Blank;
  /** The list, to tell whether a row is on screen. */
  readonly list: AnimatedRef<View>;
  /**
   * The rows closing together, as a deleted message and its time header
   * do (see `useClose`), or `NONE`.
   */
  readonly batch: SharedValue<number>;
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
  blank,
  children,
}: {
  list: AnimatedRef<View>;
  blank?: Blank;
  children: ReactNode;
}) {
  const pivot = useSharedValue(NONE);
  const place = useSharedValue(0);
  const offset = useSharedValue(0);
  const below = useSharedValue(0);
  const batch = useSharedValue(NONE);
  return (
    <GrowthContext value={{ batch, below, blank, list, offset, pivot, place }}>
      {children}
    </GrowthContext>
  );
}

/**
 * Whether a row's move adds to the one under way: rows closing together
 * (a deleted message and its time header) move what's above the newest
 * of them by both their heights.
 */
function movesTogether(growth: Growth, batch: number) {
  "worklet";
  return batch !== -1 && growth.batch.get() === batch;
}

/**
 * Updates a thread's blank space for content that changed by `delta`,
 * and returns how much it changed, which moves every row by that much.
 */
function blankChange(blank: Blank | undefined, delta: number) {
  "worklet";
  if (blank === undefined) return 0;
  const content = blank.content.get() + delta;
  const before = blank.space.get();
  const after = Math.max(0, blank.list.get() - content);
  blank.content.set(content);
  blank.space.set(after);
  return after - before;
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
  /** Rows closing together (see `useClose`); -1 for none. */
  batch: number,
) {
  "worklet";
  // A view mounted in this same change can't be measured yet; it's where
  // the change is, on screen.
  const row = measure(measured);
  const list = measure(growth.list);
  const below =
    row !== null &&
    list !== null &&
    row.pageY + row.height > list.pageY + list.height + 1;
  if (below) return;
  const together = movesTogether(growth, batch);
  // The same row again mid-move (its space measured again) adds to it too.
  const carries = together || growth.pivot.get() === order;
  const moved = blankChange(growth.blank, delta);
  growth.batch.set(batch);
  growth.pivot.set(together ? Math.max(growth.pivot.get(), order) : order);
  growth.place.set(place);
  growth.offset.set((carries ? growth.offset.get() : 0) + delta + moved);
  growth.below.set((carries ? growth.below.get() : 0) + moved);
  growth.below.set(withTiming(0, { duration: GROW_MS, easing: GROW_EASING }));
  growth.offset.set(
    withTiming(0, { duration: GROW_MS, easing: GROW_EASING }, (finished) => {
      if (finished === true) growth.batch.set(-1);
    }),
  );
}

/**
 * Closes a row that's leaving (a deleted message, faded out) in one
 * layout change, as `GrowingSpace` opens one: what was above it is drawn
 * where it was and eases down into the gap. Rows closing in the same
 * `batch` move what's above them once, by all their heights.
 */
export function useClose() {
  const growth = useGrowth();
  return (
    { order, measured }: { order: number; measured: AnimatedRef<View> },
    batch: number,
    /** What it keeps of its height (see `Leave`). */
    room: number,
  ) => {
    "worklet";
    const height = measure(measured)?.height ?? room;
    lift(growth, { measured, order, place: Place.top }, room - height, batch);
  };
}

/**
 * A row's place while space above it moves: rows older than the growing
 * one, and, when `withOwn`, the growing row itself (stacked rows, whose
 * reactions open below the message). And its fade and height as it leaves
 * (see `Leave`).
 */
export function useRowLift(
  order: number,
  withOwn: boolean,
  { opacity, kept }: LeaveState,
) {
  const { pivot, offset, below, place } = useGrowth();
  return useAnimatedStyle(() => {
    const growing = pivot.get();
    // A space at the top of a row (see `Settle`) leaves the row below it.
    const own = withOwn && growing === order && place.get() >= 0;
    let translateY = 0;
    if (growing > order || own) {
      translateY = offset.get();
    } else if (growing < order) {
      translateY = below.get();
    }
    const transform = [{ translateY }];
    const height = kept.get();
    // Not animated: a leaving row's height changes once, in the same frame
    // as `useClose` draws what moved back where it was.
    return height === -1
      ? { opacity: opacity.get(), transform }
      : { height, opacity: 0, overflow: "hidden" as const, transform };
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
    // As in `useRowLift`: a space at a row's top doesn't move the row.
    const moves = rowMoves && growth.place.get() >= 0;
    let translateY = 0;
    if (growing && above && !moves) translateY = growth.offset.get();
    if (growing && !above) {
      translateY = growth.below.get() - (moves ? growth.offset.get() : 0);
    }
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
  /** The height it had before it mounted, when that's not 0 or `height`. */
  from?: number;
  children?: ReactNode;
}

function Space({
  height,
  order,
  place,
  animate,
  measured,
  from,
  children,
}: SpaceProps) {
  const growth = useGrowth();
  // Opening as it mounts, when what it makes room for arrived while you
  // watched.
  const space = useSharedValue(from ?? (animate ? 0 : height));
  useAnimatedReaction(
    () => height,
    (now) => {
      const delta = now - space.get();
      if (delta === 0) return;
      space.set(now);
      if (animate) lift(growth, { measured, order, place }, delta, -1);
    },
    [height, animate, order, place],
  );
  // eslint-disable-next-line vera/no-layout-animation -- Not animated: the height changes once, in the same frame as the lift, which does the moving.
  const style = useAnimatedStyle(() => ({ height: space.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Where a row's header shrinks once it's shown (the message before it was
 * deleted, so it joins the run above now: see `headerHeight`), a space as
 * tall as what it lost takes its place in that same change, then closes
 * as reactions' space does. (A header that grows is made room for by the
 * deleted row, see `Leave`.)
 */
export function Settle({ header, order }: { header: number; order: number }) {
  const [shown, setShown] = useState(header);
  const [lost, setLost] = useState({ height: 0, times: 0 });
  const measured = useAnimatedRef<View>();
  if (header !== shown) {
    setShown(header);
    if (header < shown) {
      setLost({ height: shown - header, times: lost.times + 1 });
    }
  }
  if (lost.height === 0) return null;
  return (
    <Animated.View key={lost.times} ref={measured}>
      <Space
        height={0}
        from={lost.height}
        order={order}
        place={Place.gap}
        animate
        measured={measured}
      />
    </Animated.View>
  );
}
