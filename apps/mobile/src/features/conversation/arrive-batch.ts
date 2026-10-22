import type { View } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";

import type { Growth, Move } from "./moves";
import { startMove } from "./moves";

// Rows that come in together open together (see `Arrive`): in a busy
// conversation a dozen or more mount at once, and each starting a move of
// its own took the few moves there are from one another, drawing rows over
// each other mid-rise.

/** A row that has been measured and opens now. */
export interface Arrival {
  /** Its order (see `rowOrder`). */
  readonly order: number;
  /** Its height, open. */
  readonly natural: number;
  /** It takes the typing indicator's place, whose space closes with it. */
  readonly taking: boolean;
  /** The row, measured to tell whether it's on screen. */
  readonly measured: AnimatedRef<View>;
  /**
   * Opens it, drawn `rise` below its place, with the move that makes room
   * for it; the row that started the frame's move waits for it to reach
   * the screen (`lands`). Returns what raises it further, for a newer row
   * opening under it in the same frame.
   */
  readonly open: (
    move: Move | undefined,
    rise: number,
    lands: boolean,
  ) => (by: number) => void;
}

/** A row opened this frame, as the rows opening after it need it. */
interface Opened {
  readonly order: number;
  readonly room: number;
  readonly raise: (by: number) => void;
}

/** The rows opening in one frame, and their move. */
interface Batch {
  move: Move | undefined;
  readonly opened: Opened[];
}

declare global {
  /** This frame's opening rows, by list (see `batchFor`). */
  var __arrivals: Map<number, Batch> | undefined;
}

/**
 * The rows opening in the list `id` this frame, kept on the UI thread
 * itself (a shared value copies what it's given, and these hold
 * functions), and let go of in the next.
 */
function batchFor(id: number) {
  "worklet";
  globalThis.__arrivals ??= new Map();
  const batches = globalThis.__arrivals;
  let batch = batches.get(id);
  if (batch === undefined) {
    batch = { move: undefined, opened: [] };
    batches.set(id, batch);
    requestAnimationFrame(() => batches.delete(id));
  }
  return batch;
}

/**
 * Opens a measured row now, in the frame it's measured in, as one opening
 * alone always has: a row growing out of the typing indicator has to take
 * its place in that frame, or the indicator is gone a frame before it
 * shows. Rows opening in the same frame share one move, by all their
 * heights, from the oldest of them; each rises by its own height and those
 * of the newer ones under it, so they rise together.
 */
export function joinArrivals(growth: Growth, arrival: Arrival) {
  "worklet";
  const batch = batchFor(growth.id);
  let room = arrival.natural;
  if (arrival.taking) {
    room -= growth.typing.get();
    growth.typing.set(0);
  }
  // Older rows already open rise by this one too; it rises by the newer.
  let rise = room;
  for (const opened of batch.opened) {
    if (opened.order < arrival.order) opened.raise(room);
    else rise += opened.room;
  }
  // The same move again adds to it (see `startMove`), from the oldest row.
  const pivot = batch.move?.pivot.get() ?? arrival.order;
  const move = startMove(
    growth,
    { order: pivot, place: 0, whole: true },
    room,
    arrival.measured,
  );
  if (move !== undefined && arrival.order < move.pivot.get()) {
    move.pivot.set(arrival.order);
  }
  // The row that starts the frame's move waits for it to land.
  const lands = batch.move === undefined && move !== undefined;
  batch.move ??= move;
  const raise = arrival.open(move, rise, lands);
  batch.opened.push({ order: arrival.order, raise, room });
}
