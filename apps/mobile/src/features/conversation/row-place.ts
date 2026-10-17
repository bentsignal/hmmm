/**
 * Where a space, or a piece of a row, sits in its row, top to bottom: a
 * space at place 2 opens just above the piece at place 2, below those at
 * 0 and 1 (see `usePieceLift`). A message numbers its parts (see
 * `Reactable`); these are the ends.
 */
export const Place = {
  /** Above every part of the message: its sender's name, its quote. */
  top: -1,
  /** Below every part of the message: stacked rows' last reactions. */
  bottom: 1_000,
} as const;
