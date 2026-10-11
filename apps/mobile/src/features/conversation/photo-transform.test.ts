import assert from "node:assert/strict";
import { test } from "node:test";

import type { Point, Transform } from "./photo-transform.ts";
import {
  addSample,
  bandDrag,
  bandOffset,
  bandScale,
  bandTransform,
  centroid,
  dismissTransform,
  doubleTapTransform,
  exitDuration,
  IDENTITY,
  liftSamples,
  MAX_SCALE,
  panLimits,
  pinchTransform,
  rubberBand,
  settledTransform,
  shouldDismiss,
  spread,
  unBandDrag,
  unBandOffset,
  unBandScale,
  unBandTransform,
  velocity,
  zoomAround,
} from "./photo-transform.ts";

const frame = { height: 800, width: 400 };
/** A landscape photo: fit, it's 400 × 200, with black above and below. */
const photo = { height: 1000, width: 2000 };

/** Where `transform` draws the point `p` of the fitted photo. */
function draw(transform: Transform, p: Point) {
  return {
    x: transform.x + transform.scale * p.x,
    y: transform.y + transform.scale * p.y,
  };
}

/** The point of the fitted photo `transform` draws at screen point `s`. */
function under(transform: Transform, s: Point) {
  return {
    x: (s.x - transform.x) / transform.scale,
    y: (s.y - transform.y) / transform.scale,
  };
}

function near(actual: number, expected: number, message?: string) {
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    message ?? `${actual} ≈ ${expected}`,
  );
}

void test("a fit photo can't move; zoomed in, only as far as its edges", () => {
  assert.deepEqual(panLimits(frame, photo, 1), { x: 0, y: 0 });
  // 2× is 800 × 400: 200 to spare each side, still shorter than the screen.
  assert.deepEqual(panLimits(frame, photo, 2), { x: 200, y: 0 });
  // 5× is 2000 × 1000: 800 wide each side, 100 tall each side.
  assert.deepEqual(panLimits(frame, photo, 5), { x: 800, y: 100 });
});

void test("without the photo's size, it's assumed to fill the screen", () => {
  assert.deepEqual(panLimits(frame, null, 2), { x: 200, y: 400 });
});

void test("the point under the fingers stays under them while pinching", () => {
  const start = { scale: 1.5, x: 40, y: -30 };
  const from = { x: 60, y: 90 };
  const point = under(start, from);
  for (const ratio of [0.5, 0.9, 1, 1.3, 2.7]) {
    // The fingers also drift while pinching.
    const to = { x: from.x + 25 * ratio, y: from.y - 10 * ratio };
    const moved = pinchTransform(start, from, to, ratio);
    near(moved.scale, start.scale * ratio);
    const drawn = draw(moved, point);
    near(drawn.x, to.x);
    near(drawn.y, to.y);
  }
});

void test("one finger drags the photo exactly as far as the finger moves", () => {
  const start = { scale: 3, x: 10, y: 20 };
  const moved = pinchTransform(start, { x: 0, y: 0 }, { x: 33, y: -12 }, 1);
  assert.deepEqual(moved, { scale: 3, x: 43, y: 8 });
});

void test("a pinch composed from rebased baselines matches one long pinch", () => {
  // Fingers land, pinch, a third finger lands (the center and spread jump,
  // so the viewer rebases), and pinch more: the photo ends where a single
  // pinch over the same zoom and movement would leave it.
  const start = IDENTITY;
  const a = { x: 10, y: 20 };
  const b = { x: 30, y: 50 };
  const step1 = pinchTransform(start, a, b, 2);
  const c = { x: -40, y: 70 }; // the new center after the finger lands
  const d = { x: -10, y: 100 }; // and where it moves to
  const step2 = pinchTransform(step1, c, d, 1.25);
  const point = under(start, a);
  const drawn = draw(step2, point);
  // The original point moved with the fingers: b, then shifted by d - c
  // and scaled around the new center.
  near(drawn.x, d.x + 1.25 * (b.x - c.x));
  near(drawn.y, d.y + 1.25 * (b.y - c.y));
  near(step2.scale, 2.5);
});

void test("zoomAround keeps the point on screen where it is", () => {
  const start = { scale: 2, x: -50, y: 15 };
  const point = { x: 120, y: -80 };
  const before = under(start, point);
  const zoomed = zoomAround(start, point, 4);
  near(zoomed.scale, 4);
  const drawn = draw(zoomed, before);
  near(drawn.x, point.x);
  near(drawn.y, point.y);
});

void test("rubber-banding is continuous at the edge and never passes its limit", () => {
  near(bandOffset(100, 100, 400), 100);
  near(bandOffset(100.001, 100, 400), 100.00055, "starts at about half pace");
  assert.ok(bandOffset(1e9, 100, 400) < 500);
  near(bandOffset(-130, 100, 400), -100 - rubberBand(30, 400));
  near(bandOffset(50, 100, 400), 50);
});

void test("un-banding undoes banding", () => {
  for (const value of [-900, -150, -100, -3, 0, 42, 100, 160, 700]) {
    near(unBandOffset(bandOffset(value, 100, 400), 100, 400), value);
  }
  for (const scale of [0.2, 0.6, 0.95, 1, 2, 5, 6, 12]) {
    near(unBandScale(bandScale(scale)), scale);
  }
  const raw = { scale: 6, x: 1300, y: -400 };
  const shown = bandTransform(frame, photo, raw);
  const back = unBandTransform(frame, photo, shown);
  near(back.scale, raw.scale);
  near(back.x, raw.x);
  near(back.y, raw.y);
});

void test("a pinch below fit only gives a little, and never below 3/4", () => {
  assert.equal(bandScale(1), 1);
  assert.ok(bandScale(0.8) < 1 && bandScale(0.8) > 0.8);
  assert.ok(bandScale(0.01) > 0.75);
  assert.ok(bandScale(7) > MAX_SCALE && bandScale(7) < 7);
});

void test("shown positions stay within the edges plus the rubber band", () => {
  const shown = bandTransform(frame, photo, { scale: 2, x: 500, y: 30 });
  assert.equal(shown.scale, 2);
  assert.ok(shown.x > 200 && shown.x < 600);
  // The photo is shorter than the screen at 2×, so it can't move up or down
  // past center by much.
  assert.ok(shown.y > 0 && shown.y < 30);
});

void test("let go below fit, the photo returns exactly to fit, centered", () => {
  assert.deepEqual(
    settledTransform(
      frame,
      photo,
      { scale: 0.85, x: 30, y: -12 },
      { x: 0, y: 0 },
    ),
    IDENTITY,
  );
});

void test("let go past the edges, the photo returns to them", () => {
  const settled = settledTransform(
    frame,
    photo,
    { scale: 2, x: 260, y: 40 },
    { x: 0, y: 0 },
  );
  assert.deepEqual(settled, { scale: 2, x: 200, y: 0 });
});

void test("let go past the maximum, the photo shrinks back toward the fingers", () => {
  const shown = { scale: 6, x: 300, y: 20 };
  const focal = { x: 50, y: 10 };
  const settled = settledTransform(frame, photo, shown, focal);
  assert.equal(settled.scale, MAX_SCALE);
  const limits = panLimits(frame, photo, MAX_SCALE);
  const expected = zoomAround(shown, focal, MAX_SCALE);
  near(settled.x, Math.max(-limits.x, Math.min(limits.x, expected.x)));
  near(settled.y, Math.max(-limits.y, Math.min(limits.y, expected.y)));
});

void test("double-tap zooms in on the tapped point, then back to fit", () => {
  const tap = { x: 100, y: 20 };
  const zoomed = doubleTapTransform(frame, photo, IDENTITY, tap);
  near(zoomed.scale, 2.5);
  // 2.5× is 1000 wide: 300 to spare each side, so the tapped point can stay.
  near(zoomed.x, tap.x * (1 - 2.5));
  // It's 500 tall, shorter than the screen: centered vertically.
  near(zoomed.y, 0);
  assert.deepEqual(doubleTapTransform(frame, photo, zoomed, tap), IDENTITY);
});

void test("double-tap on the black around a photo keeps its edges in", () => {
  // Below a square photo's bottom edge, 2.5× would push it past the top.
  const square = { height: 1000, width: 1000 };
  const zoomed = doubleTapTransform(frame, square, IDENTITY, { x: 0, y: 380 });
  near(zoomed.y, -panLimits(frame, square, 2.5).y);
});

void test("fingers' center and spread", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];
  assert.deepEqual(centroid(points), { x: 5, y: 0 });
  assert.equal(spread(points), 5);
  assert.equal(spread([{ x: 3, y: 4 }]), 0);
});

void test("a flick's speed comes from its last moments only", () => {
  let samples = addSample([], { t: 0, x: 0, y: 0 });
  // Slow at first...
  for (let t = 16; t <= 400; t += 16) {
    samples = addSample(samples, { t, x: t * 0.1, y: 0 });
  }
  // ...then fast.
  const x0 = samples.at(-1)?.x ?? 0;
  for (let t = 416; t <= 480; t += 16) {
    samples = addSample(samples, { t, x: x0 + (t - 400) * 2, y: 0 });
  }
  const speed = velocity(liftSamples(samples, 490));
  assert.ok(speed.x > 1500, `${speed.x} should be near 2000`);
});

void test("a finger that stops before lifting doesn't flick", () => {
  let samples = addSample([], { t: 0, x: 0, y: 0 });
  samples = addSample(samples, { t: 16, x: 30, y: 0 });
  // Held still for a while, then lifted.
  assert.deepEqual(velocity(liftSamples(samples, 300)), { x: 0, y: 0 });
});

void test("a lift a frame after the last move still flicks", () => {
  let samples = addSample([], { t: 0, x: 0, y: 0 });
  samples = addSample(samples, { t: 16, x: 20, y: 0 });
  samples = addSample(samples, { t: 32, x: 40, y: 0 });
  near(velocity(liftSamples(samples, 45)).x, 1250);
});

void test("dropped frames don't turn a flick into a stop", () => {
  // Touches arriving 110ms apart, lifted one interval after the last.
  let samples = addSample([], { t: 0, x: 0, y: 0 });
  samples = addSample(samples, { t: 110, x: 110, y: 0 });
  samples = addSample(samples, { t: 220, x: 220, y: 0 });
  near(velocity(liftSamples(samples, 330)).x, 1000);
  // Held for a long while at that pace is still a stop.
  assert.deepEqual(velocity(liftSamples(samples, 800)), { x: 0, y: 0 });
});

void test("a swipe closes when far enough down or flicked down", () => {
  assert.equal(shouldDismiss(40, 0), false);
  assert.equal(shouldDismiss(140, 0), true);
  assert.equal(shouldDismiss(20, 900), true);
  assert.equal(shouldDismiss(140, -800), false, "flicked back up");
  assert.equal(shouldDismiss(-140, 0), false);
});

void test("a swiped photo shrinks around the point under the finger", () => {
  const anchor = { x: 80, y: -120 };
  const drag = { x: 15, y: 200 };
  const transform = dismissTransform(drag, anchor, frame.height);
  assert.ok(transform.scale < 1);
  const drawn = draw(transform, anchor);
  near(drawn.x, anchor.x + drag.x);
  near(drawn.y, anchor.y + drag.y);
  assert.equal(dismissTransform({ x: 0, y: 0 }, anchor, frame.height).scale, 1);
});

void test("the photo leaves at the finger's speed, within bounds", () => {
  // An ease-out quad starting at 2000/s covers 600 in 600ms... clamped.
  assert.equal(exitDuration(600, 2000), 320);
  near(exitDuration(300, 2400), 250);
  assert.equal(exitDuration(10, 5000), 160);
});

void test("a photo dragged up resists, and un-banding the drag undoes it", () => {
  const up = bandDrag({ x: 5, y: -300 }, frame.height);
  assert.ok(up.y < 0 && up.y > -300);
  near(unBandDrag(up, frame.height).y, -300);
  assert.deepEqual(bandDrag({ x: 5, y: 120 }, frame.height), { x: 5, y: 120 });
});
