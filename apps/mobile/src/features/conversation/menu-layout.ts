// Where the long-press menu puts the lifted element, its reaction bar, and
// its actions, so all of them fit on screen.

export interface Rect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface Size {
  readonly height: number;
  readonly width: number;
}

/** Space between the lifted element and the bar or the actions. */
export const GAP = 10;
/** Space kept clear at the screen's edges. */
export const EDGE = 12;
/** How much the lifted element grows, where it has room to. */
export const LIFT = 0.035;

export interface MenuLayout {
  /**
   * How much the element is scaled, from its top corner on its side: it
   * grows a little as it lifts, or shrinks when it's too tall to leave room
   * for the bar and the actions.
   */
  readonly scale: number;
  /** How far the element moves so the bar and actions fit on screen. */
  readonly shift: number;
  readonly barTop: number;
  readonly barLeft: number;
  readonly menuTop: number;
  readonly menuLeft: number;
}

/**
 * Lays the menu out around `frame`, the element as it sits in the
 * conversation. The bar goes above it and the actions below. An element low
 * on screen moves up until the actions fit under it, one high up moves down
 * under the bar, and one taller than the room between them shrinks until it
 * fits, as iMessage does, so every action is always on screen.
 */
export function menuLayout({
  frame,
  align,
  screen,
  insets,
  bar,
  menu,
}: {
  frame: Rect;
  /** The side the element sits on; it stays lined up with that edge. */
  align: "end" | "start";
  screen: Size;
  insets: { readonly bottom: number; readonly top: number };
  bar: Size;
  /** The actions, with a height of 0 when there are none. */
  menu: Size;
}) {
  const minTop = insets.top + EDGE + bar.height + GAP;
  const maxBottom =
    screen.height -
    insets.bottom -
    EDGE -
    (menu.height > 0 ? menu.height + GAP : 0);
  const room = Math.max(0, maxBottom - minTop);
  // It grows no closer to the far edge than it sits to its own, so an
  // element as wide as the conversation (a stacked row) stays on screen.
  const margin =
    align === "end" ? screen.width - frame.x - frame.width : frame.x;
  const fits = Math.max(
    1,
    (screen.width - margin * 2) / Math.max(1, frame.width),
  );
  const scale = Math.min(1 + LIFT, fits, room / Math.max(1, frame.height));
  const height = frame.height * scale;
  const width = frame.width * scale;
  const top = Math.max(minTop, Math.min(frame.y, maxBottom - height));
  const left = align === "end" ? frame.x + frame.width - width : frame.x;
  function side(itemWidth: number) {
    const x = align === "end" ? left + width - itemWidth : left;
    return Math.max(EDGE, Math.min(x, screen.width - itemWidth - EDGE));
  }
  return {
    barLeft: side(bar.width),
    barTop: top - GAP - bar.height,
    menuLeft: side(menu.width),
    menuTop: top + height + GAP,
    scale,
    shift: top - frame.y,
  } satisfies MenuLayout;
}
