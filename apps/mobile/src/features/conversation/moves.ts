import type { View } from "react-native";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import {
  Easing,
  makeMutable,
  measure,
  withTiming,
} from "react-native-reanimated";

// How the messages move as a row's space opens or closes (see `Move`), for
// `grow.tsx` and the rows that open (see `Arrive`).

/** How long the messages take to move when a row's space opens or closes. */
export const GROW_MS = 260;
export const GROW_EASING = Easing.out(Easing.cubic);
/** Frames to wait for a change to reach the screen before moving on. */
const LAND_TRIES = 30;

/**
 * A row that gains or loses space (its first reaction arrives, or its last
 * goes; a new message opens under it; someone starts typing) changes the
 * list's layout once, at full size. Animating the space's height instead
 * re-lays out every row in the list each frame, which ran at 30fps. In
 * that same frame, everything the change moved is drawn back where it was
 * (a transform, which takes no layout) and eases into place.
 *
 * What moves: in an inverted list kept still from the bottom, a row that
 * grows pushes everything above its new space up (older rows, and the
 * pieces of the row itself above the space, see `usePieceLift`), and
 * nothing below it.
 *
 * The space and the moves must reach the screen in the same frame, or the
 * messages jump for a frame. Reanimated sends transforms straight to the
 * view, but a height through a layout commit, which waits while React is
 * committing too (as the list re-renders around a new reaction). So
 * while a move is `pending`, the styles it moves carry a prop that also
 * takes the commit (`IN_COMMIT`), and land with the height; once the
 * height is on screen, they go back to the fast path.
 */
export interface Move {
  /** The growing row's order (see `rowOrder`). */
  readonly pivot: SharedValue<number>;
  /** Where in that row the space is (see `Place`). */
  readonly place: SharedValue<number>;
  /** The whole row is new: none of its own pieces move. */
  readonly whole: SharedValue<boolean>;
  /** How far what moved is drawn from where it's laid out. */
  readonly offset: SharedValue<number>;
  /** Its space hasn't reached the screen yet. */
  readonly pending: SharedValue<boolean>;
}

/** Moves at once: a message, its time header, and typing, together. */
export const MOVES = 4;

export interface Growth {
  readonly moves: readonly Move[];
  /** The list, to tell whether a row is on screen. */
  readonly list: AnimatedRef<View>;
  /** The space under the newest message for who's typing. */
  readonly typing: SharedValue<number>;
}

/** No row is growing: no order is below it. */
const NONE = -1;

/**
 * A style prop that doesn't change how anything looks and that Reanimated
 * doesn't send straight to the view, so a style carrying it lands in the
 * same layout commit as a space opening (see `Move`).
 */
const IN_COMMIT = { backfaceVisibility: "visible" } as const;

export function newMove() {
  return {
    offset: makeMutable(0),
    pending: makeMutable(false),
    pivot: makeMutable(NONE),
    place: makeMutable(0),
    whole: makeMutable(false),
  };
}

/** Where a space is, and what it moves. */
export interface Pivot {
  /** The row's order (see `rowOrder`). */
  order: number;
  /** Where in the row the space is (see `Place`). */
  place: number;
  /** The whole row is new (see `Move`). */
  whole?: boolean;
}

/** The move already going for the same space, or a free one. */
function moveFor(growth: Growth, { order, place, whole = false }: Pivot) {
  "worklet";
  let free: Move | undefined;
  for (const move of growth.moves) {
    const same =
      move.pivot.get() === order &&
      move.place.get() === place &&
      move.whole.get() === whole;
    if (same) return move;
    // At rest, or the closest to it when all are moving.
    if (
      free === undefined ||
      Math.abs(move.offset.get()) < Math.abs(free.offset.get())
    ) {
      free = move;
    }
  }
  return free;
}

/** Whether the row measured by `measured` is below the bottom of the list. */
function belowScreen(growth: Growth, measured: AnimatedRef<View>) {
  "worklet";
  const row = measure(measured);
  const list = measure(growth.list);
  if (row === null || list === null) return false;
  return row.pageY + row.height > list.pageY + list.height + 1;
}

/**
 * Draws what a space at `pivot` moves as before it changed by `delta`,
 * then eases it into place. Call it in the same frame callback that
 * changes the space (see `inFrame`). A row below the bottom of the screen
 * moves nothing: the list's scroll anchor keeps what's on screen still
 * then.
 */
export function startMove(
  growth: Growth,
  pivot: Pivot,
  delta: number,
  measured: AnimatedRef<View>,
) {
  "worklet";
  if (delta === 0 || belowScreen(growth, measured)) return undefined;
  const move = moveFor(growth, pivot);
  if (move === undefined) return undefined;
  // The same space again mid-move adds to it.
  const same =
    move.pivot.get() === pivot.order && move.place.get() === pivot.place;
  const carried = same ? move.offset.get() : 0;
  move.pivot.set(pivot.order);
  move.place.set(pivot.place);
  move.whole.set(pivot.whole ?? false);
  move.pending.set(true);
  move.offset.set(carried + delta);
  // Easing from the frame after, once the change is on screen: the frame
  // that lays it out can run long, and an ease started with it would skip
  // ahead by as much.
  requestAnimationFrame(() => {
    move.offset.set(withTiming(0, { duration: GROW_MS, easing: GROW_EASING }));
  });
  return move;
}

/**
 * Waits, from the next frame, for `measured` to be `height` tall in the
 * list's layout, then lets `move` go back to the fast path (see `Move`)
 * and calls `done`.
 */
export function land({
  move,
  measured,
  height,
  done,
}: {
  move: Move | undefined;
  measured: AnimatedRef<View>;
  height: number;
  done?: () => void;
}) {
  "worklet";
  let tries = 0;
  function check() {
    const now = measure(measured);
    const there = now !== null && Math.abs(now.height - height) < 0.5;
    if (!there && tries < LAND_TRIES) {
      tries += 1;
      requestAnimationFrame(check);
      return;
    }
    move?.pending.set(false);
    done?.();
  }
  requestAnimationFrame(check);
}

/**
 * Runs `change` at the start of the next frame. Every space and move set
 * in one such callback has its styles worked out together, after it, so
 * they reach the screen in the same frame (see `Move`); and a space that
 * just mounted has its style hooked up by then.
 */
export function inFrame(change: () => void) {
  "worklet";
  requestAnimationFrame(change);
}

/** How far the moves draw a row at `order` from where it's laid out. */
export function rowShift(
  moves: readonly Move[],
  order: number,
  withOwn: boolean,
) {
  "worklet";
  let shift = 0;
  let pending = false;
  for (const move of moves) {
    const pivot = move.pivot.get();
    const own = withOwn && !move.whole.get() && pivot === order;
    if (pivot > order || own) {
      shift += move.offset.get();
      if (move.pending.get()) pending = true;
    }
  }
  return { pending, shift };
}

/** A transform to `translateY`, in the layout commit while it's `pending`. */
export function moved(translateY: number, pending: boolean) {
  "worklet";
  const style = { transform: [{ translateY }] };
  return pending ? { ...style, ...IN_COMMIT } : style;
}

/** How far the moves draw a piece of a row from where it's laid out. */
export function pieceShift(
  moves: readonly Move[],
  {
    order,
    place,
    rowMoves,
  }: { order: number; place: number; rowMoves: boolean },
) {
  "worklet";
  let shift = 0;
  let pending = false;
  for (const move of moves) {
    const own = move.pivot.get() === order && !move.whole.get();
    // Above the space in a row that stays, or below it in one that moves.
    if (own && move.place.get() > place !== rowMoves) {
      shift += rowMoves ? -move.offset.get() : move.offset.get();
      if (move.pending.get()) pending = true;
    }
  }
  return { pending, shift };
}
