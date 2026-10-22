import type { View } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";

import type { Growth, Move } from "./moves";
import { risesOf } from "./batch-rises";
import { startMove } from "./moves";

// Rows that come in together open together (see `Arrive`): in a busy
// conversation a dozen or more mount at once, and each starting a move of
// its own took the few moves there are from one another, drawing rows over
// each other mid-rise.

/** A row that has been measured and is waiting to open. */
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
   * for the rows opening with it. The oldest of them waits for the move to
   * reach the screen (`lands`).
   */
  readonly open: (move: Move | undefined, rise: number, lands: boolean) => void;
}

declare global {
  /** Rows waiting to open, by list (see `waitingFor`). */
  var __arrivals: Map<number, Arrival[]> | undefined;
}

/**
 * The rows waiting to open in the list `id`, kept on the UI thread itself:
 * a shared value copies what it's given, and these hold functions.
 */
function waitingFor(id: number) {
  "worklet";
  globalThis.__arrivals ??= new Map();
  let waiting = globalThis.__arrivals.get(id);
  if (waiting === undefined) {
    waiting = [];
    globalThis.__arrivals.set(id, waiting);
  }
  return waiting;
}

function openArrivals(growth: Growth) {
  "worklet";
  const waiting = waitingFor(growth.id);
  const batch = waiting.splice(0).sort((a, b) => a.order - b.order);
  const oldest = batch[0];
  if (oldest === undefined) return;
  // The typing indicator's space, if one takes its place, closes with it.
  const rooms = batch.map((arrival) => {
    if (!arrival.taking) return arrival.natural;
    const room = arrival.natural - growth.typing.get();
    growth.typing.set(0);
    return room;
  });
  const rises = risesOf(rooms);
  const move = startMove(
    growth,
    { order: oldest.order, place: 0, whole: true },
    rises[0] ?? 0,
    oldest.measured,
  );
  batch.forEach((arrival, index) => {
    arrival.open(move, rises[index] ?? 0, index === 0);
  });
}

/**
 * Opens every row measured in one frame together, in the next frame: the
 * rows above them move up once, by all their heights, and each rises out
 * of its place by its own height and those of the newer ones under it, as
 * it would have, one move each, if there were moves enough.
 */
export function joinArrivals(growth: Growth, arrival: Arrival) {
  "worklet";
  const waiting = waitingFor(growth.id);
  waiting.push(arrival);
  if (waiting.length === 1) requestAnimationFrame(() => openArrivals(growth));
}
