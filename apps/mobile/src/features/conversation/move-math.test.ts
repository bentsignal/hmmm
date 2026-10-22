import assert from "node:assert/strict";
import test from "node:test";

import type { MoveNow } from "./move-math.ts";
import { allStill, pieceShift, rowShift } from "./move-math.ts";

const AT_REST = {
  below: 0,
  offset: 0,
  pending: false,
  pivot: -1,
  place: 0,
  whole: false,
} satisfies MoveNow;

/** A space opening by 40 in the row at order 10, at `place` in it. */
function opening(place: number, whole = false) {
  return { ...AT_REST, offset: 40, pending: true, pivot: 10, place, whole };
}

void test("at rest nothing moves, and the rows say so", () => {
  assert.equal(allStill([AT_REST, AT_REST]), true);
  assert.equal(allStill([AT_REST, opening(1)]), false);
  assert.deepEqual(rowShift([AT_REST], 5, false), {
    pending: false,
    shift: 0,
  });
});

void test("rows older than the growing one move with what's above the space", () => {
  const moves = [opening(1)];
  assert.deepEqual(rowShift(moves, 9, false), { pending: true, shift: 40 });
  // Newer rows move with what's below it, which only a thread's room moves.
  assert.deepEqual(rowShift(moves, 11, false), { pending: false, shift: 0 });
});

void test("the growing row moves itself only where its pieces don't", () => {
  // Stacked rows move as a whole with their reactions (`withOwn`).
  assert.equal(rowShift([opening(1)], 10, true).shift, 40);
  assert.equal(rowShift([opening(1)], 10, false).shift, 0);
  // A new row opening whole moves none of its own pieces.
  assert.equal(rowShift([opening(1, true)], 10, true).shift, 0);
  // A space at its top (`Settle`) leaves the row where it is.
  assert.equal(rowShift([opening(-1)], 10, true).shift, 0);
});

void test("a piece above the space moves with the rows above, one below doesn't", () => {
  const moves = [opening(2)];
  function at(place: number) {
    return pieceShift(moves, { order: 10, place, rowMoves: false }).shift;
  }
  assert.equal(at(0), 40);
  assert.equal(at(1), 40);
  assert.equal(at(2), 0);
  assert.equal(at(3), 0);
  // Pieces of another row, or of a row opening whole, don't move on their
  // own: their row does.
  assert.equal(
    pieceShift(moves, { order: 9, place: 0, rowMoves: false }).shift,
    0,
  );
  assert.equal(
    pieceShift([opening(2, true)], { order: 10, place: 0, rowMoves: false })
      .shift,
    0,
  );
});

void test("when the row moves itself, its pieces below the space move back", () => {
  const moves = [opening(2)];
  function at(place: number) {
    return pieceShift(moves, { order: 10, place, rowMoves: true }).shift;
  }
  assert.equal(at(0), 0);
  assert.equal(at(3), -40);
});

void test("a space under all of a bubble moves its row with the rows above", () => {
  const moves = [opening(1_000)];
  // The row moves, not its pieces on their own as well.
  assert.equal(rowShift(moves, 10, false).shift, 40);
  assert.equal(
    pieceShift(moves, { order: 10, place: 0, rowMoves: false }).shift,
    0,
  );
});
