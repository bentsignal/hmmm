// What the moves draw where (see `Move` in moves.ts), worked out from
// their values this frame: no Reanimated here, so it's tested on its own.

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
    // A space at the top of a row (see `Settle`) leaves the row below it.
    const own = withOwn && !move.whole && pivot === order && move.place >= 0;
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
  // As in `rowShift`: a space at a row's top doesn't move the row.
  const rowGoes = rowMoves && move.place >= 0;
  if (above) return rowGoes ? 0 : move.offset;
  return move.below - (rowGoes ? move.offset : 0);
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
