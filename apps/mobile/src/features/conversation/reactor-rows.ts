import type { ReactionSummary } from "~/features/messaging/reactions";

// Sizes for the panel of who reacted, so the menu can place it before it's
// drawn: a column per emoji, with who used it under it.

export const REACTOR_COLUMN = 64;
export const REACTORS_PADDING = 10;
/** The emoji's circle at the top of a column. */
export const REACTOR_EMOJI = 42;
/** The row of photos under it (`Avatar` "sm"). */
export const REACTOR_FACES = 28;
const GAP = 8;

/** The panel's height, the same however many reacted. */
export const REACTORS_HEIGHT =
  REACTORS_PADDING * 2 + REACTOR_EMOJI + GAP + REACTOR_FACES;

/** Each emoji, most used first, as the panel's columns. */
export function reactorColumns(reactions: readonly ReactionSummary[]) {
  return [...reactions].sort((a, b) => b.count - a.count);
}

/**
 * The panel's width: every column, up to `maxWidth`, past which it
 * scrolls sideways.
 */
export function reactorsWidth(
  reactions: readonly ReactionSummary[],
  maxWidth: number,
) {
  return Math.min(
    maxWidth,
    reactions.length * REACTOR_COLUMN + REACTORS_PADDING * 2,
  );
}

export const REACTORS_GAP = GAP;
