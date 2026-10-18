import type { ReactNode } from "react";
import type { View } from "react-native";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import Animated, {
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { Growth } from "./moves";
import {
  inFrame,
  land,
  moved,
  MOVES,
  newMove,
  pieceShift,
  rowShift,
  startMove,
} from "./moves";

const GrowthContext = createContext<Growth | null>(null);

export function useGrowth() {
  const growth = use(GrowthContext);
  if (growth === null) {
    throw new Error("Rows that grow must render inside GrowthProvider");
  }
  return growth;
}

/** The list whose rows grow; `list` is the view it fills. */
export function GrowthProvider({
  list,
  children,
}: {
  list: AnimatedRef<View>;
  children: ReactNode;
}) {
  const [moves] = useState(() => Array.from({ length: MOVES }, newMove));
  const typing = useSharedValue(0);
  return (
    <GrowthContext value={{ list, moves, typing }}>{children}</GrowthContext>
  );
}

/**
 * A row's place while space below it moves: rows older than the growing
 * one, and, when `withOwn`, the growing row itself (stacked rows, whose
 * reactions open below the message).
 */
export function useRowLift(order: number, withOwn: boolean) {
  const { moves } = useGrowth();
  return useAnimatedStyle(() => {
    const { pending, shift } = rowShift(moves, order, withOwn);
    return moved(shift, pending);
  });
}

/**
 * A piece of the growing row at `place` (see `Place`). In a row that stays
 * where it is (bubbles), a piece above the space moves up with the rows
 * above. In one that moves with them (stacked rows, `rowMoves`), a piece
 * below the space stays put.
 */
export function usePieceLift(
  order: number,
  place: number,
  rowMoves = false,
  /** Hidden until it's set: what the space opens for. */
  shown?: SharedValue<boolean>,
) {
  const { moves } = useGrowth();
  return useAnimatedStyle(() => {
    const { pending, shift } = pieceShift(moves, { order, place, rowMoves });
    const style = moved(shift, pending);
    if (shown === undefined) return style;
    return { ...style, opacity: shown.get() ? 1 : 0 };
  });
}

/**
 * Space in a row that opens to `height` (or closes to 0) at once, while the
 * messages it moves ease into place (see `Move`). With `animate` off it
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
  /** Set as it opens, in the same frame (see `usePieceLift`). */
  opened?: SharedValue<boolean>;
}

function Space({
  height,
  order,
  place,
  animate,
  measured,
  opened,
}: SpaceProps) {
  const growth = useGrowth();
  const ref = useAnimatedRef<View>();
  // Opening as it mounts, when what it makes room for arrived while you
  // watched.
  const space = useSharedValue(animate ? 0 : height);
  useAnimatedReaction(
    () => height,
    (now) => {
      inFrame(() => {
        const delta = now - space.get();
        if (delta === 0) return;
        space.set(now);
        opened?.set(now > 0);
        if (!animate) return;
        const move = startMove(growth, { order, place }, delta, measured);
        land({ height: now, measured: ref, move });
      });
    },
    [height, animate, order, place],
  );
  // eslint-disable-next-line vera/no-layout-animation -- Not animated: the height changes once, in the same frame as the lift, which does the moving.
  const style = useAnimatedStyle(() => ({ height: space.get() }));
  return <Animated.View ref={ref} style={style} />;
}
