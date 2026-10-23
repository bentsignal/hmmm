import { useEffect, useRef } from "react";

import type { Message } from "~/features/conversation/types";
import { benchMessages } from "./synthetic";

// What the list benchmark measures (see `bench.tsx`), and the scenarios
// that feed it messages.

export interface MountResult {
  rows: number;
  mountMs: number[];
  unmountMs: number[];
}

/** The run in progress and the last result, for scripts. */
class Probe {
  run:
    | { count: number; left: number; mountMs: number[]; unmountMs: number[] }
    | undefined;
  unmountAt: number | undefined;
  result: MountResult | undefined;
}

export const probe = new Probe();

export function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** One page of older messages: asked for, and arrived (NaN until then). */
interface Load {
  readonly requested: number;
  applied: number;
}

/** What a run measured since its last reset. */
export class BenchMetrics {
  startedAt = Date.now();
  stalls = new Array<number>();
  loads = new Array<Load>();
  skipped = 0;
  contentChanges = new Array<number>();
  arrived = 0;

  reset() {
    this.startedAt = Date.now();
    this.stalls = [];
    this.loads = [];
    this.skipped = 0;
    this.contentChanges = [];
    this.arrived = 0;
  }

  /** A page asked for, to mark `applied` once it's in. */
  asked() {
    const load = { applied: Number.NaN, requested: Date.now() };
    this.loads.push(load);
    return load;
  }

  /** Older messages were wanted while a page was on its way, or none left. */
  skip() {
    this.skipped += 1;
  }

  stall(ms: number) {
    this.stalls.push(ms);
  }

  contentChanged() {
    this.contentChanges.push(Date.now());
  }

  arrive(count: number) {
    this.arrived += count;
  }

  summary(edge: { ms: number; hits: number }) {
    const applied = this.loads.filter((load) => !Number.isNaN(load.applied));
    // How many times the content grew in the 3s after each page arrived.
    const steps = applied.map(
      (load) =>
        this.contentChanges.filter(
          (at) => at >= load.applied && at < load.applied + 3000,
        ).length,
    );
    return {
      seconds: Math.round((Date.now() - this.startedAt) / 100) / 10,
      jsStalls: {
        count: this.stalls.length,
        totalMs: this.stalls.reduce((total, gap) => total + gap, 0),
        worstMs: Math.max(0, ...this.stalls),
      },
      loads: applied.length,
      skippedLoads: this.skipped,
      loadMsMedian: median(
        applied.map((load) => load.applied - load.requested),
      ),
      contentStepsPerPage: {
        max: Math.max(0, ...steps),
        median: median(steps),
      },
      stuckAtTopMs: Math.round(edge.ms),
      stuckAtTopTimes: edge.hits,
      arrived: this.arrived,
    };
  }
}

/** The last `mount`'s timings per row (see `MountProbe`). */
export function mountedReport() {
  const result = probe.result;
  if (result === undefined) return null;
  const { rows } = result;
  function per(values: number[]) {
    return Math.round((median(values) / rows) * 100) / 100;
  }
  return {
    rows,
    mountMsMedian: Math.round(median(result.mountMs) * 10) / 10,
    mountMsPerRow: per(result.mountMs),
    unmountMsMedian: Math.round(median(result.unmountMs) * 10) / 10,
    unmountMsPerRow: per(result.unmountMs),
    mountMs: result.mountMs.map(Math.round),
  };
}

/** Counts the JavaScript thread's stalls into `metrics`, with a timer. */
export function useStalls(metrics: BenchMetrics) {
  // eslint-disable-next-line no-restricted-syntax -- Measures the JavaScript thread's stalls with a timer, outside React; dev builds only.
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (now - last > 50) metrics.stall(Math.round(now - last));
      last = now;
    }, 16);
    return () => clearInterval(timer);
  }, [metrics]);
}

type SetMessages = (update: (now: Message[]) => Message[]) => void;

/**
 * Adds new messages after the newest at `rate` a second for `seconds`,
 * numbered on from `from`; returns what stops them.
 */
export function startArrivals(
  { rate, seconds, from }: { rate: number; seconds: number; from: number },
  metrics: BenchMetrics,
  setMessages: SetMessages,
) {
  const tick = Math.max(16, 1000 / rate);
  const each = Math.max(1, Math.round((rate * tick) / 1000));
  let index = from;
  const until = Date.now() + seconds * 1000;
  const timer = setInterval(() => {
    if (Date.now() > until) {
      clearInterval(timer);
      return;
    }
    const added = Array.from({ length: each }, () => {
      index += 1;
      return benchMessages({ count: 1, endAt: Date.now(), from: index });
    }).flat();
    metrics.arrive(added.length);
    setMessages((now) => [...now, ...added]);
  }, tick);
  return () => clearInterval(timer);
}

/**
 * Loads older messages before `messages`' oldest, `page` at a time,
 * `latency` ms after they're asked for.
 */
export function useOlderPages(
  messages: readonly Message[],
  setMessages: SetMessages,
  {
    page,
    latency,
    metrics,
  }: { page: number; latency: number; metrics: BenchMetrics },
) {
  const loading = useRef(false);
  const oldest = messages[0];
  const first =
    oldest === undefined ? 0 : Number(oldest.id.slice("bench-".length));
  return () => {
    if (loading.current || oldest === undefined || first <= 0) {
      metrics.skip();
      return;
    }
    loading.current = true;
    const load = metrics.asked();
    const size = Math.min(page, first);
    setTimeout(() => {
      const older = benchMessages({
        count: size,
        endAt: oldest.sentAt.getTime() - 60_000,
        from: first - size,
      });
      load.applied = Date.now();
      loading.current = false;
      setMessages((now) => [...older, ...now]);
    }, latency);
  };
}
