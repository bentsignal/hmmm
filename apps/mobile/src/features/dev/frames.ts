import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";

/**
 * How smoothly the UI thread drew while recording: every frame it drew, and
 * the ones that took noticeably longer than the screen's refresh. Animations
 * run on the UI thread, so a slow frame there is a visible hitch, whatever
 * JavaScript was doing.
 */
export interface FrameReport {
  /** Frames drawn while recording. */
  readonly frames: number;
  readonly seconds: number;
  /** The screen's refresh rate, from the typical frame. */
  readonly hz: number;
  /** Frames that took over 1.5 refreshes: each is a visible hitch. */
  readonly slow: number;
  /** Refreshes missed in all (a 3-refresh frame misses 2). */
  readonly dropped: number;
  /** The longest frames, in milliseconds, longest first. */
  readonly worst: readonly number[];
}

interface Recording {
  last: number;
  intervals: number[];
}

declare global {
  var veraFrames: Recording | undefined;
}

function summarize(intervals: readonly number[]) {
  "worklet";
  const sorted = [...intervals].sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length / 2)] ?? 1000 / 60;
  const slow = intervals.filter((interval) => interval > typical * 1.5);
  return {
    dropped: intervals.reduce(
      (missed, interval) =>
        missed + Math.max(0, Math.round(interval / typical) - 1),
      0,
    ),
    frames: intervals.length,
    hz: Math.round(1000 / typical),
    seconds:
      Math.round(intervals.reduce((total, interval) => total + interval, 0)) /
      1000,
    slow: slow.length,
    worst: [...slow]
      .sort((a, b) => b - a)
      .slice(0, 10)
      .map((interval) => Math.round(interval * 10) / 10),
  } satisfies FrameReport;
}

/** Starts recording the UI thread's frames, replacing any recording. */
export function startFrames() {
  scheduleOnUI(() => {
    "worklet";
    // Replacing the recording ends the last one's loop.
    const recording = {
      intervals: new Array<number>(),
      last: 0,
    } satisfies Recording;
    globalThis.veraFrames = recording;
    function tick(time: number) {
      "worklet";
      if (globalThis.veraFrames !== recording) return;
      if (recording.last > 0) recording.intervals.push(time - recording.last);
      recording.last = time;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/** Stops recording and reports how the frames went. */
export function stopFrames() {
  return new Promise<FrameReport | null>((resolve) => {
    scheduleOnUI(() => {
      "worklet";
      const recording = globalThis.veraFrames;
      globalThis.veraFrames = undefined;
      if (recording === undefined) {
        scheduleOnRN(resolve, null);
        return;
      }
      scheduleOnRN(resolve, summarize(recording.intervals));
    });
  });
}
