/**
 * The photo viewer's touch tracking: pinching, dragging, and swiping to
 * close, all on the UI thread. The math is in `photo-transform.ts`.
 */
import type {
  GestureStateManager,
  GestureTouchEvent,
} from "react-native-gesture-handler";
import { Gesture } from "react-native-gesture-handler";

import type { Point } from "./photo-transform";
import type { Mode, Viewer } from "./photo-viewer-state";
import {
  addSample,
  bandDrag,
  bandTransform,
  centroid,
  liftSamples,
  MIN_SCALE,
  pinchTransform,
  spread,
  unBandDrag,
  unBandTransform,
  velocity,
} from "./photo-transform";
import {
  IDLE,
  release,
  settle,
  show,
  shownOf,
  stopAnimations,
} from "./photo-viewer-state";

/** How far a finger moves before a touch counts as a drag. */
const SLOP = 6;

/** The touches still down, from the center of the frame. */
function fingers(viewer: Viewer, event: GestureTouchEvent, lifting: boolean) {
  "worklet";
  const frame = viewer.frame.get();
  // A lift's event still lists the lifted touches among all of them.
  const lifted = new Set(
    lifting ? event.changedTouches.map((touch) => touch.id) : [],
  );
  return event.allTouches
    .filter((touch) => !lifted.has(touch.id))
    .map((touch) => ({
      x: touch.x - frame.width / 2,
      y: touch.y - frame.height / 2,
    }));
}

/**
 * Starts a new baseline from where the fingers and photo are now. Called
 * whenever a finger lands or lifts, so the photo carries on from where it
 * is instead of jumping to the new fingers' center or spread.
 */
function rebase(viewer: Viewer, mode: Mode, points: Point[]) {
  "worklet";
  const track = viewer.track.get();
  const origin = centroid(points);
  viewer.track.set({
    ...track,
    base: track.raw,
    focal: origin,
    mode,
    origin,
    spread: spread(points),
    travelBase: track.travel,
  });
}

/**
 * Picks the photo up where it is, even mid-animation: the raw position is
 * the one that rubber-bands to what's on screen, so nothing jumps.
 */
function pickUp(viewer: Viewer) {
  "worklet";
  stopAnimations(viewer);
  const dragging =
    Math.abs(viewer.dragX.get()) > 0.5 || Math.abs(viewer.dragY.get()) > 0.5;
  const frame = viewer.frame.get();
  const raw = dragging
    ? {
        scale: 1,
        ...unBandDrag(
          { x: viewer.dragX.get(), y: viewer.dragY.get() },
          frame.height,
        ),
      }
    : unBandTransform(frame, viewer.photo.get(), shownOf(viewer));
  viewer.track.set({ ...IDLE, raw });
  return dragging;
}

function onTouchesDown(
  viewer: Viewer,
  event: GestureTouchEvent,
  manager: GestureStateManager,
) {
  "worklet";
  if (viewer.closing.get()) {
    manager.fail();
    return;
  }
  const points = fingers(viewer, event, false);
  const { mode } = viewer.track.get();
  if (mode === "idle") {
    manager.activate();
    // Caught while springing back from a swipe to close: keep swiping.
    const dragging = pickUp(viewer);
    if (dragging) {
      rebase(viewer, "dismiss", points);
      return;
    }
  }
  // A second finger starts a pinch, even at fit. A swipe to close stays one.
  const next =
    mode === "dismiss" ? "dismiss" : points.length > 1 ? "zoom" : mode;
  rebase(viewer, next === "idle" ? "pending" : next, points);
}

function onTouchesMove(viewer: Viewer, event: GestureTouchEvent) {
  "worklet";
  const points = fingers(viewer, event, false);
  const track = viewer.track.get();
  if (points.length === 0 || track.mode === "idle") return;
  const focal = centroid(points);
  if (track.mode === "pending") {
    const moved = Math.hypot(
      focal.x - track.origin.x,
      focal.y - track.origin.y,
    );
    if (moved < SLOP) return;
    // At fit, a drag swipes the photo away; zoomed in, it moves the photo.
    const dismissing = viewer.scale.get() <= MIN_SCALE + 0.01;
    if (dismissing) {
      viewer.anchor.set(track.origin);
      viewer.track.set({ ...track, raw: { scale: 1, x: 0, y: 0 } });
    }
    // The drag starts here, so the slop doesn't show as a jump.
    rebase(viewer, dismissing ? "dismiss" : "zoom", points);
    return;
  }
  const now = Date.now();
  const frame = viewer.frame.get();
  if (track.mode === "dismiss") {
    const raw = {
      scale: 1,
      x: track.base.x + focal.x - track.origin.x,
      y: track.base.y + focal.y - track.origin.y,
    };
    const drag = bandDrag(raw, frame.height);
    viewer.dragX.set(drag.x);
    viewer.dragY.set(drag.y);
    viewer.track.set({
      ...track,
      focal,
      raw,
      samples: addSample(track.samples, { t: now, x: drag.x, y: drag.y }),
    });
    return;
  }
  // Two or more fingers zoom by how much farther apart they've moved; one
  // finger drags with a ratio of 1.
  const nowSpread = spread(points);
  const ratio =
    track.spread > 0 && nowSpread > 0 ? nowSpread / track.spread : 1;
  const raw = pinchTransform(track.base, track.origin, focal, ratio);
  show(viewer, bandTransform(frame, viewer.photo.get(), raw));
  const travel = {
    x: track.travelBase.x + focal.x - track.origin.x,
    y: track.travelBase.y + focal.y - track.origin.y,
  };
  viewer.track.set({
    ...track,
    focal,
    raw,
    samples: addSample(track.samples, { t: now, ...travel }),
    travel,
  });
}

function onTouchesUp(
  viewer: Viewer,
  event: GestureTouchEvent,
  manager: GestureStateManager,
  onClose: () => void,
) {
  "worklet";
  const points = fingers(viewer, event, true);
  const track = viewer.track.get();
  if (track.mode === "idle") return;
  if (points.length > 0) {
    // Fewer fingers: carry on from here with the ones still down.
    rebase(viewer, track.mode, points);
    return;
  }
  const speed = velocity(liftSamples(track.samples, Date.now()));
  viewer.track.set(IDLE);
  manager.end();
  if (track.mode === "dismiss") release(viewer, speed, onClose);
  else settle(viewer, track.focal, track.mode === "zoom" ? speed : undefined);
}

/**
 * Pinching, dragging, and swiping to close, all from raw touches. Tracking
 * the fingers directly, rather than combining a pinch and a pan gesture,
 * keeps the photo continuous when fingers land or lift mid-gesture, the same
 * way on both platforms.
 */
export function touchGesture(viewer: Viewer, onClose: () => void) {
  return Gesture.Manual()
    .onTouchesDown((event, manager) => onTouchesDown(viewer, event, manager))
    .onTouchesMove((event) => onTouchesMove(viewer, event))
    .onTouchesUp((event, manager) =>
      onTouchesUp(viewer, event, manager, onClose),
    )
    .onTouchesCancelled((event, manager) =>
      onTouchesUp(
        viewer,
        { ...event, changedTouches: event.allTouches },
        manager,
        onClose,
      ),
    );
}
