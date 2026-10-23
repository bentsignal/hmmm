import type { View } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";

import type { Growth, Move } from "./moves";
import { startMove } from "./moves";

// Rows that come in together open together (see `Arrive`): in a busy
// conversation a dozen or more mount at once, and each starting a move of
// its own took the few moves there are from one another, drawing rows over
// each other mid-rise.
//
// Past a pace no one reads every message at (a stream's chat in a busy
// moment), rows open at once instead, as Discord's do: no rise, no fade,
// the messages above simply making room. Once it slows, they rise in
// again. So does a batch big enough on its own (as after the app catches
// up): a screenful rising and fading in together blanked the screen.

/** The window the pace is counted over. */
const PACE_WINDOW_MS = 2000;
/** This many rows opening in the window, it's a firehose... */
const FIREHOSE_FROM = 8;
/** ...until no more than this many do. */
const FIREHOSE_UNTIL = 3;
/** This many rows mounting together open at once, whatever the pace. */
const BIG_BATCH = 6;
/** Rows mounted within this of each other came in together. */
const TOGETHER_MS = 100;

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
   * opening under it in the same frame. `instant`, it shows at once, with
   * nothing moving (see `firehose`).
   */
  readonly open: (
    move: Move | undefined,
    rise: number,
    lands: boolean,
    instant: boolean,
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
  /**
   * They open at once (see `firehose` and `BIG_BATCH`), decided as the
   * first opens.
   */
  readonly instant: boolean;
}

/**
 * When a list's rows last opened and mounted, and whether it's a
 * firehose.
 */
interface Pace {
  times: number[];
  mounts: number[];
  fast: boolean;
}

declare global {
  /** This frame's opening rows, by list (see `batchFor`). */
  var __arrivals: Map<number, Batch> | undefined;
  /** Each list's pace (see `firehose`). */
  var __arrivalPace: Map<number, Pace> | undefined;
}

/**
 * The list `id`'s pace, kept on the UI thread (see `batchFor`). Defined
 * before the worklets that call it: a worklet isn't hoisted.
 */
function paceOf(id: number) {
  "worklet";
  globalThis.__arrivalPace ??= new Map();
  const paces = globalThis.__arrivalPace;
  let pace = paces.get(id);
  if (pace === undefined) {
    pace = { fast: false, mounts: [], times: [] };
    paces.set(id, pace);
  }
  return pace;
}

/**
 * Counts a row opening in the list `id`, and tells whether rows are
 * coming in so fast they should open at once: from `FIREHOSE_FROM` in the
 * last `PACE_WINDOW_MS` until it's down to `FIREHOSE_UNTIL`, so a pace
 * near either doesn't flip back and forth.
 */
function firehose(id: number) {
  "worklet";
  const pace = paceOf(id);
  const now = Date.now();
  pace.times = pace.times.filter((time) => now - time < PACE_WINDOW_MS);
  pace.times.push(now);
  if (pace.times.length >= FIREHOSE_FROM) pace.fast = true;
  else if (pace.times.length <= FIREHOSE_UNTIL) pace.fast = false;
  return pace.fast;
}

/**
 * Notes a row arriving in the list `id` as it mounts, before it's
 * measured and opens: a batch knows from these how many rows came in with
 * its first (see `BIG_BATCH`).
 */
export function arrivalMounted(id: number) {
  "worklet";
  const pace = paceOf(id);
  const now = Date.now();
  pace.mounts = pace.mounts.filter((time) => now - time < TOGETHER_MS);
  pace.mounts.push(now);
}

/** How many rows mounted with the ones opening now (see `arrivalMounted`). */
function mountedTogether(id: number) {
  "worklet";
  const now = Date.now();
  return paceOf(id).mounts.filter((time) => now - time < TOGETHER_MS).length;
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
  const fast = firehose(id);
  if (batch === undefined) {
    const instant = fast || mountedTogether(id) >= BIG_BATCH;
    batch = { instant, move: undefined, opened: [] };
    batches.set(id, batch);
    requestAnimationFrame(() => batches.delete(id));
  }
  return batch;
}

/**
 * How much room a row opening takes: its height, less the typing
 * indicator's space when it takes its place, which closes now.
 */
function roomFor(growth: Growth, arrival: Arrival) {
  "worklet";
  if (!arrival.taking) return arrival.natural;
  const room = arrival.natural - growth.typing.get();
  growth.typing.set(0);
  return room;
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
  const room = roomFor(growth, arrival);
  if (batch.instant) {
    arrival.open(undefined, 0, false, true);
    return;
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
  const raise = arrival.open(move, rise, lands, false);
  batch.opened.push({ order: arrival.order, raise, room });
}
