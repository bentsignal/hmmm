/**
 * The photo viewer's gesture math, kept free of React and Reanimated so it
 * can be unit tested. Every function is a worklet: the viewer calls them on
 * the UI thread from its touch handlers.
 *
 * Positions are measured from the center of the frame (the screen), the
 * point the photo scales around. A photo at `{ scale, x, y }` draws a point
 * `p` of the fitted photo at `x + scale * p.x, y + scale * p.y`.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
export const DOUBLE_TAP_SCALE = 2.5;
/** How springy an edge feels: UIScrollView's constant. */
const RUBBER_BAND = 0.55;

export const IDENTITY = { scale: 1, x: 0, y: 0 };

// Worklets capture what they use when they're defined, so a helper has to
// come before the functions that call it.
export function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

/** The photo's size when it's fit (`contain`) inside the frame. */
export function fitSize(frame: Size, photo: Size | null) {
  "worklet";
  if (photo === null || photo.width <= 0 || photo.height <= 0) return frame;
  const fit = Math.min(frame.width / photo.width, frame.height / photo.height);
  return { height: photo.height * fit, width: photo.width * fit };
}

/** How far the photo can move each way at `scale` before an edge shows. */
export function panLimits(frame: Size, photo: Size | null, scale: number) {
  "worklet";
  const fitted = fitSize(frame, photo);
  return {
    x: Math.max(0, (fitted.width * scale - frame.width) / 2),
    y: Math.max(0, (fitted.height * scale - frame.height) / 2),
  };
}

/**
 * How far something dragged `overshoot` past its limit actually moves: it
 * starts at a little over half the finger's pace and never passes
 * `dimension`, like UIScrollView.
 */
export function rubberBand(overshoot: number, dimension: number) {
  "worklet";
  if (overshoot <= 0 || dimension <= 0) return 0;
  return (1 - 1 / ((overshoot * RUBBER_BAND) / dimension + 1)) * dimension;
}

/** The overshoot that `rubberBand` turned into `banded`: its inverse. */
export function unRubberBand(banded: number, dimension: number) {
  "worklet";
  if (banded <= 0 || dimension <= 0) return 0;
  const fraction = Math.min(banded / dimension, 0.999);
  return (dimension / RUBBER_BAND) * (1 / (1 - fraction) - 1);
}

/** Keeps `value` within `±limit`, stretching like a rubber band past it. */
export function bandOffset(value: number, limit: number, dimension: number) {
  "worklet";
  if (value > limit) return limit + rubberBand(value - limit, dimension);
  if (value < -limit) return -limit - rubberBand(-limit - value, dimension);
  return value;
}

/** The finger position that `bandOffset` turned into `banded`. */
export function unBandOffset(banded: number, limit: number, dimension: number) {
  "worklet";
  if (banded > limit) return limit + unRubberBand(banded - limit, dimension);
  if (banded < -limit) return -limit - unRubberBand(-limit - banded, dimension);
  return banded;
}

/**
 * A pinch can push the scale a little past its range: below fit by at most
 * a quarter, above the maximum by at most half again.
 */
export function bandScale(scale: number) {
  "worklet";
  if (scale < MIN_SCALE) {
    return MIN_SCALE - rubberBand(MIN_SCALE - scale, MIN_SCALE * 0.25);
  }
  if (scale > MAX_SCALE) {
    return MAX_SCALE + rubberBand(scale - MAX_SCALE, MAX_SCALE * 0.5);
  }
  return scale;
}

export function unBandScale(scale: number) {
  "worklet";
  if (scale < MIN_SCALE) {
    return MIN_SCALE - unRubberBand(MIN_SCALE - scale, MIN_SCALE * 0.25);
  }
  if (scale > MAX_SCALE) {
    return MAX_SCALE + unRubberBand(scale - MAX_SCALE, MAX_SCALE * 0.5);
  }
  return scale;
}

/**
 * Where the fingers have taken the photo: the point that was under the
 * fingers' center `from` is now under `to`, and the photo has grown by
 * `ratio` (how much farther apart the fingers are). One finger has a ratio
 * of 1, which is a plain drag.
 */
export function pinchTransform(
  start: Transform,
  from: Point,
  to: Point,
  ratio: number,
) {
  "worklet";
  return {
    scale: start.scale * ratio,
    x: to.x - ratio * (from.x - start.x),
    y: to.y - ratio * (from.y - start.y),
  };
}

/** `transform` zoomed to `scale` with `point` on screen staying put. */
export function zoomAround(transform: Transform, point: Point, scale: number) {
  "worklet";
  return pinchTransform(transform, point, point, scale / transform.scale);
}

/** What the screen shows for where the fingers have dragged the photo. */
export function bandTransform(frame: Size, photo: Size | null, raw: Transform) {
  "worklet";
  const scale = bandScale(raw.scale);
  const limits = panLimits(frame, photo, scale);
  return {
    scale,
    x: bandOffset(raw.x, limits.x, frame.width),
    y: bandOffset(raw.y, limits.y, frame.height),
  };
}

/** The inverse of `bandTransform`, to pick up a photo mid-animation. */
export function unBandTransform(
  frame: Size,
  photo: Size | null,
  shown: Transform,
) {
  "worklet";
  const limits = panLimits(frame, photo, shown.scale);
  return {
    scale: unBandScale(shown.scale),
    x: unBandOffset(shown.x, limits.x, frame.width),
    y: unBandOffset(shown.y, limits.y, frame.height),
  };
}

/**
 * Where the photo settles when let go: back within its scale range and its
 * edges. A photo let go below fit returns to fit, centered; past the
 * maximum it shrinks back toward the fingers at `focal`.
 */
export function settledTransform(
  frame: Size,
  photo: Size | null,
  shown: Transform,
  focal: Point,
) {
  "worklet";
  if (shown.scale <= MIN_SCALE) return IDENTITY;
  const zoomed =
    shown.scale > MAX_SCALE ? zoomAround(shown, focal, MAX_SCALE) : shown;
  const limits = panLimits(frame, photo, zoomed.scale);
  return {
    scale: zoomed.scale,
    x: clamp(zoomed.x, -limits.x, limits.x),
    y: clamp(zoomed.y, -limits.y, limits.y),
  };
}

/** Double-tap: zoom in on the tapped point, or back out to fit. */
export function doubleTapTransform(
  frame: Size,
  photo: Size | null,
  shown: Transform,
  point: Point,
) {
  "worklet";
  if (shown.scale > MIN_SCALE + 0.01) return IDENTITY;
  return settledTransform(
    frame,
    photo,
    zoomAround(shown, point, DOUBLE_TAP_SCALE),
    point,
  );
}

export function centroid(points: readonly Point[]) {
  "worklet";
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** How spread out the fingers are: their mean distance from their center. */
export function spread(points: readonly Point[]) {
  "worklet";
  if (points.length < 2) return 0;
  const center = centroid(points);
  let total = 0;
  for (const point of points) {
    total += Math.hypot(point.x - center.x, point.y - center.y);
  }
  return total / points.length;
}

export interface Sample extends Point {
  /** Milliseconds. */
  t: number;
}

/** Only this much recent movement counts toward a flick's speed... */
const VELOCITY_WINDOW = 80;
/** ...unless touches are arriving slowly, as when frames drop. */
const SLOW_WINDOW = 250;
/** A finger still at least this long before lifting has stopped. */
const PAUSE = 50;

/** Adds a sample, dropping those too old to count toward the velocity. */
export function addSample(samples: readonly Sample[], sample: Sample) {
  "worklet";
  const kept = samples.filter(
    (old) => sample.t - old.t <= SLOW_WINDOW && old.t <= sample.t,
  );
  kept.push(sample);
  return kept;
}

/**
 * The samples as of a finger lifting at `now`. The lift comes a frame or so
 * after the last move, which isn't a stop; a finger held still for longer
 * than that (and longer than touches have been arriving apart) has stopped,
 * so it gets a sample where it rests, and no flick.
 */
export function liftSamples(samples: readonly Sample[], now: number) {
  "worklet";
  const last = samples.at(-1);
  if (last === undefined) return samples;
  const previous = samples.at(-2);
  const cadence = previous === undefined ? 0 : last.t - previous.t;
  if (now - last.t <= Math.max(PAUSE, 2 * cadence)) return samples;
  return addSample(samples, { ...last, t: now });
}

/**
 * How fast the samples were moving at the end, in points per second, over
 * the last few moments, or the last two samples if they came farther apart.
 */
export function velocity(samples: readonly Sample[]) {
  "worklet";
  const last = samples.at(-1);
  const previous = samples.at(-2);
  if (last === undefined || previous === undefined) return { x: 0, y: 0 };
  const recent = samples.find((sample) => last.t - sample.t <= VELOCITY_WINDOW);
  const first =
    recent !== undefined && last.t - recent.t >= 8 ? recent : previous;
  if (last.t - first.t < 8 || last.t - first.t > SLOW_WINDOW) {
    return { x: 0, y: 0 };
  }
  const seconds = (last.t - first.t) / 1000;
  return {
    x: (last.x - first.x) / seconds,
    y: (last.y - first.y) / seconds,
  };
}

/** A drag this far down, or a flick down this fast, closes the photo. */
export const DISMISS_DISTANCE = 100;
export const DISMISS_VELOCITY = 500;

export function shouldDismiss(dragY: number, velocityY: number) {
  "worklet";
  if (velocityY > DISMISS_VELOCITY) return true;
  // Dragged far enough, unless it's being flicked back up.
  return dragY > DISMISS_DISTANCE && velocityY > -DISMISS_VELOCITY / 2;
}

/** How far a swipe to close has gone, from 0 (not at all) to 1. */
export function dismissProgress(dragY: number, frameHeight: number) {
  "worklet";
  return clamp(dragY / (frameHeight / 2), 0, 1);
}

/** How small the photo gets as it's dragged away. */
const DISMISS_SHRINK = 0.3;

/**
 * Where a swipe to close draws the photo: it follows the finger and
 * shrinks around the point that was under it, the way Photos does.
 */
export function dismissTransform(
  drag: Point,
  anchor: Point,
  frameHeight: number,
) {
  "worklet";
  const scale = 1 - DISMISS_SHRINK * dismissProgress(drag.y, frameHeight);
  return {
    scale,
    x: drag.x + (1 - scale) * anchor.x,
    y: drag.y + (1 - scale) * anchor.y,
  };
}

/**
 * How a dragged-up photo moves: it resists, since up doesn't close it.
 */
export function bandDrag(drag: Point, frameHeight: number) {
  "worklet";
  return {
    x: drag.x,
    y: drag.y >= 0 ? drag.y : -rubberBand(-drag.y, frameHeight / 2),
  };
}

export function unBandDrag(drag: Point, frameHeight: number) {
  "worklet";
  return {
    x: drag.x,
    y: drag.y >= 0 ? drag.y : -unRubberBand(-drag.y, frameHeight / 2),
  };
}

/**
 * How long the photo takes to leave the screen after a swipe closes it, so
 * that an ease-out (quadratic) leaves at the speed the finger let go at.
 */
export function exitDuration(distance: number, speed: number) {
  "worklet";
  // An ease-out quad starts at twice its average speed.
  const duration = (2 * distance * 1000) / Math.max(speed, 1);
  return clamp(duration, 160, 320);
}
