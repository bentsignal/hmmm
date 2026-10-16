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
  /**
   * Each slow frame in order, as "<when>+<how long>" in milliseconds from
   * the start, to line them up with what was happening.
   */
  readonly timeline: readonly string[];
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
    timeline: intervals.flatMap((interval, index) => {
      if (interval <= typical * 1.5) return [];
      const at = intervals
        .slice(0, index)
        .reduce((total, earlier) => total + earlier, 0);
      return [`${Math.round(at)}+${Math.round(interval)}`];
    }),
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

/**
 * Stops recording; the report follows in `frameReport()` a moment later
 * (from the UI thread). Hermes's debugger can't wait on a promise, so
 * scripts poll for it.
 */
export function stopFrames() {
  report = undefined;
  scheduleOnUI(() => {
    "worklet";
    const recording = globalThis.veraFrames;
    globalThis.veraFrames = undefined;
    scheduleOnRN(
      setReport,
      recording === undefined ? null : summarize(recording.intervals),
    );
  });
}

/** The report from the last `stopFrames()`, once it's ready. */
let report: FrameReport | null | undefined;

function setReport(next: FrameReport | null) {
  report = next;
}

export function frameReport() {
  return report;
}
