// Which rows are on screen, for the moves (see `Growth.onScreen`).

/** The rows on screen and near it, by order (see `Growth`). */
export interface OnScreen {
  readonly oldest: number;
  readonly newest: number;
}

/** Before the list knows what's on screen: every row. */
export const ALL_ON_SCREEN = {
  newest: Infinity,
  oldest: -Infinity,
} satisfies OnScreen;

/**
 * The rows whose orders run from `oldest` to `newest` are on screen; the
 * range a move draws reaches as far again either way in time, about a
 * screen of messages, however fast they come.
 */
export function onScreenRange(oldest: number, newest: number) {
  const span = Math.max(newest - oldest, 1);
  return { newest: newest + span, oldest: oldest - span } satisfies OnScreen;
}

/** Whether the row at `order` is in `range` (see `Growth`). */
export function inRange(range: OnScreen, order: number) {
  "worklet";
  return order >= range.oldest && order <= range.newest;
}
