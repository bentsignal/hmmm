import { useLayoutEffect, useState } from "react";
import { View } from "react-native";

import type { MountResult } from "./bench-metrics";
import type { BenchRows } from "./bench-shell";
import type { MessageRow } from "~/features/conversation/build-rows";
import type { MessageLayout } from "~/features/preferences/store";
import { probe } from "./bench-metrics";
import { BenchRow } from "./bench-shell";

// What rows cost JavaScript to mount, without a list or scrolling around
// them (`engine=mount`): `bench.mount(rows, times)` mounts that many rows
// out of sight, unmounts them, and again, `times` times, each time
// different rows of the same conversation. Measured from the change to its
// layout effects, so React's render and its commit to native, not the
// native views being drawn.

interface Shown {
  readonly from: number;
  readonly count: number;
  readonly at: number;
}

/** Calls `onDone` from its layout effect: after the rows before it. */
function Done({ onDone }: { onDone: () => void }) {
  useLayoutEffect(onDone);
  return null;
}

export function MountProbe({
  rows,
  layout,
  rowKind,
  onReady,
}: {
  rows: readonly MessageRow[];
  layout: MessageLayout;
  rowKind: BenchRows;
  onReady: (mount: (count: number, times: number) => void) => void;
}) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [result, setResult] = useState<MountResult | undefined>();
  const [, setRun] = useState(0);
  // Hands the probe to scripts, which run outside React.
  useLayoutEffect(() => {
    onReady((count, times) => {
      const run = {
        count,
        left: times,
        mountMs: new Array<number>(),
        unmountMs: new Array<number>(),
      };
      probe.run = run;
      setResult(undefined);
      setShown({ at: performance.now(), count, from: 0 });
    });
  });
  function mounted() {
    const run = probe.run;
    if (run === undefined || shown === null) return;
    run.mountMs.push(performance.now() - shown.at);
    // Unmounts them on the next task, then times that.
    setTimeout(() => {
      probe.unmountAt = performance.now();
      setShown(null);
      setRun((n) => n + 1);
    }, 50);
  }
  function unmounted() {
    const run = probe.run;
    if (run === undefined || probe.unmountAt === undefined) return;
    run.unmountMs.push(performance.now() - probe.unmountAt);
    probe.unmountAt = undefined;
    run.left -= 1;
    if (run.left <= 0) {
      const done = {
        mountMs: run.mountMs,
        rows: run.count,
        unmountMs: run.unmountMs,
      };
      probe.result = done;
      probe.run = undefined;
      setResult(done);
      return;
    }
    const from =
      (run.mountMs.length * run.count) % Math.max(1, rows.length - run.count);
    setTimeout(
      () => setShown({ at: performance.now(), count: run.count, from }),
      50,
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View
        pointerEvents="none"
        style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
      >
        {shown !== null &&
          rows
            .slice(shown.from, shown.from + shown.count)
            .map((row) => (
              <BenchRow
                key={row.key}
                row={row}
                layout={layout}
                rows={rowKind}
              />
            ))}
      </View>
      {shown !== null ? (
        <Done key="mounted" onDone={mounted} />
      ) : (
        <Done key="unmounted" onDone={unmounted} />
      )}
      {result !== undefined && <View testID="mount-done" />}
    </View>
  );
}
