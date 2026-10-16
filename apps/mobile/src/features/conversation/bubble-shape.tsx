import Svg, { Path } from "react-native-svg";

/** How far the tail hangs below the bubble. */
export const TAIL_DROP = 7;
/** Bubble corner radius, a touch rounder than a capsule's for one line. */
export const BUBBLE_RADIUS = 20;

/** The tail's box: from 20 above the bubble's bottom to the tail's tip. */
const TAIL_WIDTH = 22;
const TAIL_HEIGHT = 20 + TAIL_DROP;

/**
 * Just the tail and the corner it grows from, in the tail's own box: the
 * corner curves in to a waist, the tail curls back out like a horn to a
 * round tip and sweeps up into the bottom edge, and the rest closes inside
 * the bubble, where it's the bubble's own color. The points were fitted to
 * a trace of iMessage's tail, in points from the bubble's right and bottom
 * edges, and don't scale with the bubble. Fixed, so a bubble never has to
 * be measured to draw it.
 */
const TAIL_PATH = [
  `M ${TAIL_WIDTH} 0`,
  `C ${TAIL_WIDTH} 12.35 11.48 15.7 11.48 19.93`,
  "C 11.48 22.54 12.49 23.61 13.58 25.21",
  "A 1.03 1.03 0 0 1 12.33 26.73",
  "C 4.58 23.49 2.61 20 0.11 20",
  "L 0 20",
  "L 0 0",
  "Z",
].join(" ");

/**
 * iMessage's tail on a bubble with an ordinary rounded background: drawn
 * over the bubble's bottom corner (bottom right for yours, mirrored to the
 * bottom left for theirs), hanging `TAIL_DROP` below it. Put it first in
 * the bubble, so its content draws over it.
 */
export function BubbleTail({
  color,
  isOwn,
}: {
  color: string;
  isOwn: boolean;
}) {
  return (
    <Svg
      pointerEvents="none"
      width={TAIL_WIDTH}
      height={TAIL_HEIGHT}
      viewBox={`0 0 ${TAIL_WIDTH} ${TAIL_HEIGHT}`}
      style={{
        bottom: -TAIL_DROP,
        position: "absolute",
        ...(isOwn ? { right: 0 } : { left: 0, transform: [{ scaleX: -1 }] }),
      }}
    >
      <Path d={TAIL_PATH} fill={color} />
    </Svg>
  );
}
