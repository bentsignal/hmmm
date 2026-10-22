import type Animated from "react-native-reanimated";
import type { AnimatedRef } from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
} from "react-native-reanimated";

import type { BenchEngine } from "./bench-api";
import type { BenchRows } from "./bench-shell";
import type { MessageLayout } from "~/features/preferences/store";
import { newestFirst } from "~/features/conversation/build-rows";
import { olderIsUp, setBenchApi } from "./bench-api";
import { BenchList } from "./bench-lists";
import {
  BenchMetrics,
  mountedReport,
  probe,
  startArrivals,
  useOlderPages,
  useStalls,
} from "./bench-metrics";
import { BenchShell } from "./bench-shell";
import { MountProbe } from "./mount-probe";
import { benchMessages } from "./synthetic";

// The list benchmark (dev builds only; `/dev-bench`): a made-up
// conversation in one of the list engines, with scenarios scripts run
// through `globalThis.veraDev.bench` and what they measure:
//
// - `fling(speed, ms)`: scrolls toward older messages at `speed` points a
//   second on the UI thread, as a fling does while JavaScript is busy.
//   Measures time spent stuck at the top while older messages load.
// - Older pages load as the top nears, `latency` ms after they're asked
//   for, `page` messages at a time. Measures how long they take to show and
//   how many steps the content grows in once they arrive.
// - `arrive(rate, seconds)`: new messages at `rate` a second.
// - JavaScript-thread stalls throughout.
//
// Blank areas are measured from a recording (scripts in apps/mobile/perf).

export interface BenchOptions {
  engine: BenchEngine;
  count: number;
  page: number;
  latency: number;
  recycle: boolean;
  drawDistance: number;
  layout: MessageLayout;
  /** Older messages there are to load, in all. */
  history: number;
  /** How much of each row to render (see `BenchRow`). */
  rowKind: BenchRows;
  /** How many screens from the top older messages are asked for. */
  ahead: number;
}

/**
 * The fling (see `BenchApi.fling`): each frame, the list moves `velocity`
 * on from wherever it actually is (it moves the scroll itself as older
 * content arrives above). With how far it has gone since a reset, and how
 * long it spent stuck at the top.
 */
function useFling(scrollRef: AnimatedRef<Animated.ScrollView>, up: boolean) {
  const offset = useScrollOffset(scrollRef);
  const velocity = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewport = useSharedValue(0);
  const edgeMs = useSharedValue(0);
  const edgeHits = useSharedValue(0);
  const atEdge = useSharedValue(false);
  const travelled = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (now, before) => {
      if (before !== null) {
        travelled.set(travelled.get() + Math.abs(now - before));
      }
    },
  );
  useFrameCallback((frame) => {
    "worklet";
    const speed = velocity.get();
    if (speed === 0) return;
    const step = (speed * (frame.timeSincePreviousFrame ?? 16)) / 1000;
    const max = Math.max(0, contentHeight.get() - viewport.get());
    const target = up ? offset.get() - step : offset.get() + step;
    const top = up ? target <= 0 : target >= max;
    if (top) {
      if (!atEdge.get()) edgeHits.set(edgeHits.get() + 1);
      atEdge.set(true);
      edgeMs.set(edgeMs.get() + (frame.timeSincePreviousFrame ?? 16));
    } else {
      atEdge.set(false);
    }
    scrollTo(scrollRef, 0, Math.min(max, Math.max(0, target)), false);
  });
  return {
    contentHeight,
    edge: () => ({ hits: edgeHits.get(), ms: edgeMs.get() }),
    reset: () => {
      edgeMs.set(0);
      edgeHits.set(0);
      travelled.set(0);
    },
    travelled: () => Math.round(travelled.get()),
    velocity,
    viewport,
  };
}

export function Bench(options: BenchOptions) {
  const { engine, count, page, latency, layout, history } = options;
  const [messages, setMessages] = useState(() =>
    benchMessages({ count, from: history }),
  );
  const [metrics] = useState(() => new BenchMetrics());
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const fling = useFling(scrollRef, olderIsUp(engine));
  useStalls(metrics);
  const mountProbe = useRef<
    ((count: number, times: number) => void) | undefined
  >(undefined);
  const stopArrivals = useRef<() => void>(undefined);
  const loadOlder = useOlderPages(messages, setMessages, {
    latency,
    metrics,
    page,
  });

  // eslint-disable-next-line no-restricted-syntax -- Hands the benchmark to scripts, which run outside React; dev builds only.
  useEffect(() => {
    setBenchApi({
      arrive: (rate, seconds) => {
        stopArrivals.current?.();
        stopArrivals.current = startArrivals(
          { from: history + count + metrics.arrived, rate, seconds },
          metrics,
          setMessages,
        );
      },
      fling: (speed, ms) => {
        fling.velocity.set(speed);
        setTimeout(() => fling.velocity.set(0), ms);
      },
      loadOlder: () => loadOlder(),
      mount: (rowCount, times) => {
        probe.result = undefined;
        mountProbe.current?.(rowCount, times);
      },
      mounted: mountedReport,
      report: () => ({
        ...metrics.summary(fling.edge()),
        travelled: fling.travelled(),
      }),
      reset: () => {
        metrics.reset();
        fling.reset();
      },
      stop: () => {
        fling.velocity.set(0);
        stopArrivals.current?.();
      },
    });
    return () => setBenchApi(undefined);
  });

  const rows = newestFirst(messages, layout, undefined).toReversed();
  return (
    <View className="bg-background flex-1">
      <BenchShell scrollRef={scrollRef}>
        {engine === "mount" ? (
          <MountProbe
            rows={rows}
            layout={layout}
            rowKind={options.rowKind}
            onReady={(mount) => {
              mountProbe.current = mount;
            }}
          />
        ) : (
          <BenchList
            {...options}
            rows={rows}
            onNearTop={loadOlder}
            onContentHeight={(height) => {
              metrics.contentChanged();
              fling.contentHeight.set(height);
            }}
            onViewport={(height) => fling.viewport.set(height)}
          />
        )}
      </BenchShell>
    </View>
  );
}
