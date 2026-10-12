import type { ReactionSummary } from "~/features/messaging/reactions";

// Sizes for the panel of who reacted, so the menu can place it before it's
// drawn.

export const REACTOR_ROW_HEIGHT = 48;
export const REACTORS_PADDING = 6;
/** Rows shown before the list scrolls. */
const MAX_ROWS = 5.5;
export const REACTORS_WIDTH = 260;

/** Each reaction, one row per person, in the order they reacted. */
export function reactorRows(reactions: readonly ReactionSummary[]) {
  return reactions.flatMap((reaction) =>
    reaction.accounts.map((account) => ({ account, emoji: reaction.emoji })),
  );
}

/** The panel's height for these reactions, so the menu can place it. */
export function reactorsHeight(reactions: readonly ReactionSummary[]) {
  const rows = reactorRows(reactions).length;
  if (rows === 0) return 0;
  return Math.min(rows, MAX_ROWS) * REACTOR_ROW_HEIGHT + REACTORS_PADDING * 2;
}
