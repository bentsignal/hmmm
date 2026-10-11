// Sizes for the title at the top of the message menu (a held link).

/** Lines of a menu title (a held link) before it's cut short. */
export const TITLE_LINES = 5;
export const TITLE_LINE_HEIGHT = 18;
/** About how many characters of a link fit on a line of the title. */
const TITLE_LINE_CHARACTERS = 28;
const TITLE_PADDING = 22;

/**
 * Room for the menu's title, estimated from its length so the menu can be
 * placed before it's drawn. A long link wraps onto several lines.
 */
export function menuTitleHeight(title: string | undefined) {
  if (title === undefined) return 0;
  const lines = Math.min(
    TITLE_LINES,
    Math.max(1, Math.ceil(title.length / TITLE_LINE_CHARACTERS)),
  );
  return lines * TITLE_LINE_HEIGHT + TITLE_PADDING;
}
