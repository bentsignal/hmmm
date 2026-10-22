// What scripts and the benchmark's lists share (see `bench.tsx`).

export type BenchEngine = "flat" | "legend" | "mount" | "scroll";

/** Whether scrolling toward older messages lowers the offset. */
export function olderIsUp(engine: BenchEngine) {
  return engine !== "flat";
}

export interface BenchApi {
  fling: (speed: number, ms: number) => void;
  /** Loads older messages now, wherever the list is. */
  loadOlder: () => void;
  stop: () => void;
  arrive: (rate: number, seconds: number) => void;
  reset: () => void;
  report: () => unknown;
  /** `engine=mount`: mounts `rows` rows out of sight, `times` times. */
  mount: (rows: number, times: number) => void;
  /** The last `mount`'s timings, once it's done. */
  mounted: () => unknown;
}

let current: BenchApi | undefined;

/** Hands the open benchmark to scripts, or takes it back. */
export function setBenchApi(api: BenchApi | undefined) {
  current = api;
}

/** The open benchmark, for `globalThis.veraDev.bench`. */
export function benchApi() {
  return current;
}
