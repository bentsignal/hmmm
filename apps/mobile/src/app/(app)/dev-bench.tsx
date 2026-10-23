import { Redirect, Stack, useLocalSearchParams } from "expo-router";

import type { BenchEngine } from "~/features/dev/bench/bench-api";
import { Bench } from "~/features/dev/bench/bench";
import { useDevTools } from "~/features/dev/dev-tools";
import { AccountScope } from "~/features/messaging/account";

const ENGINES = ["flat", "legend", "mount", "scroll"] satisfies BenchEngine[];

function engineOf(value: string | undefined) {
  return ENGINES.find((engine) => engine === value) ?? "flat";
}

function numberOf(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== undefined ? parsed : fallback;
}

/**
 * Dev PDS only: the list benchmark (see `features/dev/bench`). For example
 * `/dev-bench?engine=legend&count=200&page=50&latency=600`.
 */
export default function DevBench() {
  const devTools = useDevTools();
  const params = useLocalSearchParams<{
    engine?: string;
    count?: string;
    page?: string;
    latency?: string;
    recycle?: string;
    draw?: string;
    layout?: string;
    history?: string;
    rows?: string;
    ahead?: string;
  }>();
  if (!devTools.enabled) return <Redirect href="/" />;
  return (
    <AccountScope address={undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <Bench
        engine={engineOf(params.engine)}
        count={numberOf(params.count, 200)}
        page={numberOf(params.page, 50)}
        latency={numberOf(params.latency, 600)}
        recycle={params.recycle === "1"}
        drawDistance={numberOf(params.draw, 250)}
        layout={params.layout === "stacked" ? "stacked" : "bubbles"}
        history={numberOf(params.history, 3000)}
        ahead={numberOf(params.ahead, 3)}
        rowKind={
          params.rows === "plain" || params.rows === "content"
            ? params.rows
            : "full"
        }
      />
    </AccountScope>
  );
}
