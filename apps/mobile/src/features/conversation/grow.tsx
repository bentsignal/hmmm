import type { ReactNode } from "react";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import { View } from "react-native";
import Animated, {
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { Blank } from "./blank-space";
import type { LeaveState } from "./leave";
import type { MoveNow } from "./move-math";
import type { Growth } from "./moves";
import type { OnScreen } from "./screen-range";
import type { TypingDrop } from "./typing-drop";
import { useHeldHeight } from "./held-height";
import { allStill, pieceShift, rowShift } from "./move-math";
import {
  afterCommit,
  land,
  moved,
  MOVES,
  movesNow,
  newMove,
  showWithRoom,
  startMove,
} from "./moves";
import { Place } from "./row-place";
import { ALL_ON_SCREEN, inRange } from "./screen-range";

// Rows that grow and shrink while the messages around them stay still
// (see `Move` in `moves.ts`).

const GrowthContext = createContext<Growth | null>(null);

/** Lists so far, each one's number (see `Growth.id`). */
let lists = 0;

function nextListId() {
  lists += 1;
  return lists;
}

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
  blank,
  typingDrop,
  children,
}: {
  list: AnimatedRef<View>;
  blank?: Blank;
  /** Where who's typing is drawn (see `useTypingDrop`). */
  typingDrop: TypingDrop;
  children: ReactNode;
}) {
  const [moves] = useState(() => Array.from({ length: MOVES }, newMove));
  const onScreen = useSharedValue(ALL_ON_SCREEN);
  const [id] = useState(nextListId);
  const typing = useSharedValue(0);
  const { drop, dropped } = typingDrop;
  return (
    <GrowthContext
      value={{
        blank,
        id,
        list,
        moves,
        onScreen,
        typing,
        typingDrop: drop,
        typingDropped: dropped,
      }}
    >
      {children}
    </GrowthContext>
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
    const move = startMove(
      growth,
      { batch, order, place: Place.top },
      room - height,
      measured,
    );
    land({ height: room, measured, move });
  };
}

/**
 * A row's style while it's off screen and something moves: the same
 * object each frame, which Reanimated sees hasn't changed and sends
 * nothing for. In a busy conversation something is always moving, and
 * every row mounted (five screens either way) sent a transform each frame.
 */
const OFF_SCREEN = { transform: [{ translateY: 0 }] };

/**
 * A row's transform while space above it moves (see `rowShift`): none at
 * rest (see `allStill`), and none off screen.
 */
function rowMoved(
  moves: readonly MoveNow[],
  range: OnScreen,
  { order, withOwn }: { order: number; withOwn: boolean },
) {
  "worklet";
  if (allStill(moves)) return {};
  if (!inRange(range, order)) return OFF_SCREEN;
  const { pending, shift } = rowShift(moves, order, withOwn);
  return moved(shift, pending);
}

/**
 * A row's place while space above it moves: rows older than the growing
 * one, and, when `withOwn`, the growing row itself (stacked rows, whose
 * reactions open below the message). And its fade and height as it leaves
 * (see `Leave`), once it has started to.
 */
export function useRowLift(
  order: number,
  withOwn: boolean,
  leave: LeaveState | null,
  /** It's leaving now (see `Leave`). */
  leaving: boolean,
) {
  const { moves, onScreen } = useGrowth();
  return useAnimatedStyle(() => {
    const style = rowMoved(movesNow(moves), onScreen.get(), {
      order,
      withOwn,
    });
    if (leave === null) return style;
    const { opacity, kept } = leave;
    const height = kept.get();
    if (height !== -1) {
      // eslint-disable-next-line vera/no-layout-animation -- Not animated: a leaving row's height changes once, in the same frame as `useClose` draws what moved back where it was.
      return { ...style, height, opacity: 0, overflow: "hidden" as const };
    }
    // Only a row that's leaving, or back from leaving (its deletion
    // failed), sets its opacity: every row's style runs each frame while
    // rows move.
    const faded = opacity.get();
    if (!leaving && faded === 1) return style;
    return { ...style, opacity: leaving ? faded : 1 };
  });
}

/**
 * A piece of the growing row at `place` (see `Place`). In a row that stays
 * where it is (bubbles), a piece above the space moves up with the rows
 * above. In one that moves with them (stacked rows, `rowMoves`), a piece
 * below the space stays put.
 */
export function usePieceLift(order: number, place: number, rowMoves = false) {
  const { moves } = useGrowth();
  return useAnimatedStyle(() => {
    const now = movesNow(moves);
    // Empty at rest, as `useRowLift`'s is.
    if (allStill(now)) return {};
    const { pending, shift } = pieceShift(now, { order, place, rowMoves });
    return moved(shift, pending);
  });
}

/**
 * Space in a row that opens to `height` (or closes to 0) at once, while the
 * messages it moves ease into place (see `Move`). With `animate` off it
 * just changes, as for reactions already there when the row appears.
 * Nothing until it first opens, so rows that never need it cost nothing.
 */
export function GrowingSpace(props: SpaceProps) {
  const first = useFirst(props.height);
  const changed = useChangedSinceMount(props.height);
  const [used, setUsed] = useState(changed);
  if (!used && changed) setUsed(true);
  // Mounted at no height ahead of opening, so its view is on screen by
  // then: one that mounts as it opens has nothing for its height to go to
  // in that frame, while the moves go to the rows already there.
  if (props.early === true) return <Space {...props} />;

  if (used) {
    // From what it held as a plain view, if it did.
    return (
      <Space {...props} from={props.from ?? (first > 0 ? first : undefined)} />
    );
  }
  if (first === 0) return null;
  // Open when the row appeared (reactions it already had), and not
  // changed since: a plain view of that height, without the shared values
  // and styles of one that moves.
  if (!props.animate && props.children === undefined) {
    return <View style={{ height: first }} />;
  }
  return <Space {...props} />;
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
  /**
   * What it opens for, shown as the messages clear it (see `showWithRoom`)
   * and hidden as it closes.
   */
  opened?: SharedValue<number>;
  /** Mounted at no height before it first opens (see `GrowingSpace`). */
  early?: boolean;
  /**
   * When the change is on screen and the messages start easing (see
   * `land`): `opening` or closing.
   */
  onLanded?: (opening: boolean) => void;
  children?: ReactNode;
}

function Space({
  height,
  order,
  place,
  animate,
  measured,
  from,
  opened,
  onLanded,
  children,
}: SpaceProps) {
  const growth = useGrowth();
  const ref = useAnimatedRef<View>();
  // Opening as it mounts, when what it makes room for arrived while you
  // watched.
  const space = useSharedValue(from ?? (animate ? 0 : height));
  useAnimatedReaction(
    () => height,
    (now) => {
      // A frame later than it could: the React commit that brought the
      // change is still reaching the screen in the first, and Reanimated,
      // which waits while React commits, would send the moves on without
      // the space (see `IN_COMMIT`).
      afterCommit(() => {
        const delta = now - space.get();
        if (delta === 0) return;
        space.set(now);
        opened?.set(now > 0 ? showWithRoom() : 0);
        if (!animate) return;
        const move = startMove(growth, { order, place }, delta, measured);
        land({
          height: now,
          landed: () => onLanded?.(delta > 0),
          measured: ref,
          move,
        });
      });
    },
    [height, animate, order, place, onLanded],
  );
  const style = useHeldHeight(space);
  return (
    <Animated.View ref={ref} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Whether `value` has changed since the component mounted: something that
 * happened while it was on screen, so it animates in, rather than
 * something it was shown with.
 */
export function useChangedSinceMount<Value>(value: Value) {
  return value !== useFirst(value);
}

/** What `value` was when the component mounted. */
function useFirst<Value>(value: Value) {
  const [first] = useState(value);
  return first;
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
  if (header !== shown) {
    setShown(header);
    if (header < shown) {
      setLost({ height: shown - header, times: lost.times + 1 });
    }
  }
  if (lost.height === 0) return null;
  return <Settling key={lost.times} lost={lost.height} order={order} />;
}

/** `Settle`'s space as it closes, mounted only then. */
function Settling({ lost, order }: { lost: number; order: number }) {
  const measured = useAnimatedRef<View>();
  return (
    <Animated.View ref={measured}>
      <Space
        height={0}
        from={lost}
        order={order}
        place={Place.gap}
        animate
        measured={measured}
      />
    </Animated.View>
  );
}
