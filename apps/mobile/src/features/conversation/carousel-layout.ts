import type { MediaItem } from "./media-groups";

// Sizes of a stacked row's carousel of photos (see `StackedMediaCarousel`).

/** Every card is this tall; its width follows the photo's shape. */
export const CARD_HEIGHT = 200;
const MIN_CARD_WIDTH = 130;
const MAX_CARD_WIDTH = 250;
export const CARD_GAP = 6;
/** The row's padding on the right, which the carousel scrolls under. */
export const BLEED = 16;
/** One line of chips (`ChipRow`), the least a lane of them takes. */
export const CHIP_LINE = 30;
/** A chip and the gap after it, about, and each line after the first. */
const CHIP_WIDTH = 45;
const NEXT_LINE = 30;

export function cardWidth({ height, width }: MediaItem["attachment"]) {
  if (height === undefined || width === undefined || height === 0) {
    return CARD_HEIGHT;
  }
  return Math.min(
    MAX_CARD_WIDTH,
    Math.max(MIN_CARD_WIDTH, (CARD_HEIGHT * width) / height),
  );
}

/**
 * How tall a card's chips will be once laid out, about: what the lane
 * under the cards opens to before they're measured, so a row that has
 * reactions when it appears is laid out with room for them.
 */
export function chipsHeight(count: number, width: number) {
  if (count === 0) return 0;
  const perLine = Math.max(1, Math.floor(width / CHIP_WIDTH));
  return CHIP_LINE + NEXT_LINE * (Math.ceil(count / perLine) - 1);
}

/** Where each card starts, which a swipe settles on. */
export function cardOffsets(items: readonly MediaItem[]) {
  let at = 0;
  return items.map((item) => {
    const offset = at;
    at += cardWidth(item.attachment) + CARD_GAP;
    return offset;
  });
}

/** The card nearest the carousel's start at `x`. */
export function cardAt(offsets: readonly number[], x: number) {
  let nearest = 0;
  for (const [index, offset] of offsets.entries()) {
    const best = offsets[nearest] ?? 0;
    if (Math.abs(offset - x) < Math.abs(best - x)) nearest = index;
  }
  return nearest;
}
