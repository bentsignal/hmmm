import type { MediaItem } from "./media-groups";

// Sizes of bubbles' stacks of photos (see `BubbleMediaStack`).

/** The front card's width; the cards behind it peek out past it. */
export const CARD_WIDTH = 220;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 280;
/** How many cards a pile draws: the front one and two behind it. */
const PILE = 3;
export function cardHeight({ height, width }: MediaItem["attachment"]) {
  if (height === undefined || width === undefined || width === 0) {
    return CARD_WIDTH;
  }
  return Math.min(
    MAX_HEIGHT,
    Math.max(MIN_HEIGHT, (CARD_WIDTH * height) / width),
  );
}

/** The cards behind the front one, nearest first, as a pile draws them. */
export function behind(items: readonly MediaItem[], front: number) {
  return Array.from(
    { length: Math.min(PILE, items.length) - 1 },
    (_, depth) => items[(front + depth + 1) % items.length],
  ).filter((item) => item !== undefined);
}
