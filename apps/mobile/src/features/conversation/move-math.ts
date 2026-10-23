// What the moves draw where (see `Move` in moves.ts), worked out from
// their values this frame: no Reanimated here, so it's tested on its own.

import { Place } from "./row-place.ts";

/**
 * Whether a move of its own row moves the row itself: in a row that moves
 * with its pieces (stacked, `withOwn`), any space but one at its top (see
 * `Settle`); in one that stays (bubbles), a space under everything in it
 * (a thread's count, "Edited"), where all of the row is above the space.
 * Its pieces above the space then had nothing to move them, and the
 * bubble jumped up while the rows above eased.
 */
function rowGoes(move: MoveNow, withOwn: boolean) {
  "worklet";
  return (withOwn && move.place >= 0) || move.place === Place.bottom;
}

/** A move's values as they are this frame (see `movesNow`). */
export interface MoveNow {
  readonly pivot: number;
  readonly place: number;
  readonly whole: boolean;
  readonly offset: number;
  readonly below: number;
  readonly pending: boolean;
}

/**
 * How far the moves draw a row at `order` from where it's laid out: rows
 * older than a growing one, and, `withOwn`, the growing row itself, move
 * with what's above the space; newer ones with what's below it.
 */
export function rowShift(
  moves: readonly MoveNow[],
  order: number,
  withOwn: boolean,
) {
  "worklet";
  let shift = 0;
  let pending = false;
  for (const move of moves) {
    const { pivot } = move;
    const own = !move.whole && pivot === order && rowGoes(move, withOwn);
    let by = 0;
    if (pivot > order || own) by = move.offset;
    else if (pivot < order) by = move.below;
    shift += by;
    if (by !== 0 && move.pending) pending = true;
  }
  return { pending, shift };
}

/**
 * Whether every move is at rest, so nothing is drawn away from where it's
 * laid out. A row's style is then empty rather than a transform to 0: a
 * style Reanimated sees change as a row mounts (a new transform array is
 * a change) is kept and put back into every layout commit after, for
 * every row mounted, until it's copied back into React.
 */
export function allStill(moves: readonly MoveNow[]) {
  "worklet";
  for (const move of moves) {
    if (move.offset !== 0 || move.below !== 0 || move.pending) return false;
  }
  return true;
}

/** How far one move of its own row draws the piece at `place`. */
function pieceBy(move: MoveNow, place: number, rowMoves: boolean) {
  "worklet";
  const above = move.place > place;
  // As in `rowShift`.
  const goes = rowGoes(move, rowMoves);
  if (above) return goes ? 0 : move.offset;
  return move.below - (goes ? move.offset : 0);
}

/** How far the moves draw a piece of a row from where it's laid out. */
export function pieceShift(
  moves: readonly MoveNow[],
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
    if (move.pivot !== order || move.whole) continue;
    const by = pieceBy(move, place, rowMoves);
    shift += by;
    if (by !== 0 && move.pending) pending = true;
  }
  return { pending, shift };
}
