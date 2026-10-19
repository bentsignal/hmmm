import type { MediaItem } from "./media-groups";

// Sizes of the focused view of a message's photos (see `MediaGallery`).

/** Space between the cards, and how much of each neighbor shows. */
export const CARD_GAP = 14;
export const PEEK = 26;

/** A card's height at `width`, its photo's shape, up to `maxHeight`. */
export function cardHeight(item: MediaItem, width: number, maxHeight: number) {
  const { height, width: pixels } = item.attachment;
  if (height === undefined || pixels === undefined || pixels === 0) {
    return Math.min(width, maxHeight);
  }
  return Math.min(maxHeight, (width * height) / pixels);
}
