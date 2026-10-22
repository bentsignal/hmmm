import type { Query, QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { QueryObserver, useQueryClient } from "@tanstack/react-query";

import { fieldOf } from "~/features/saved/fields";
import { useAccount } from "./account";
import { isAbout } from "./live-queries";
import { windowReused } from "./message-window";

/** How long a conversation stays live after its screen closes. */
const STAY_LIVE_MS = 3 * 60 * 1000;
/** How many closed conversations stay live at once; the oldest go first. */
const STAY_LIVE_MAX = 5;

/**
 * The closed conversations staying live, oldest first, each with what
 * lets it go.
 */
const staying = new Map<string, () => void>();

/** What a window's pages ask for: their messages, reactions, and threads. */
const PAGE_OPERATIONS = new Set([
  "list",
  "thread",
  "reactions",
  "threadSummaries",
]);

/** Whether `query` is one of a window's pages (see `PAGE_OPERATIONS`). */
function ofPages(query: Query) {
  const operation = fieldOf(fieldOf(query.queryKey[5], "operation"), "type");
  return typeof operation === "string" && PAGE_OPERATIONS.has(operation);
}

/**
 * Keeps `queries` live for `STAY_LIVE_MS`, as if their screen were still
 * open: the PDS keeps sending what changes, so it's there when the
 * conversation opens again.
 */
function stayLive(
  queryClient: QueryClient,
  key: string,
  queries: readonly Query[],
) {
  staying.get(key)?.();
  const stops = queries.map((query) =>
    new QueryObserver(queryClient, {
      ...query.options,
      queryKey: query.queryKey,
    }).subscribe(() => undefined),
  );
  function letGo() {
    clearTimeout(timer);
    for (const stop of stops) stop();
    staying.delete(key);
  }
  const timer = setTimeout(letGo, STAY_LIVE_MS);
  staying.set(key, letGo);
  if (staying.size > STAY_LIVE_MAX) staying.values().next().value?.();
}

/**
 * Keeps what a conversation's screen showed live for a few minutes after
 * it closes (new messages, reactions, who's typing), so opening it again
 * shows them at once instead of catching up as it fades in. Opening it
 * again lets go of the earlier ones, which its own screen takes over. With
 * `threadId`, the same for a thread in it.
 */
export function useStayLive(conversationId: string, threadId?: string) {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  // eslint-disable-next-line no-restricted-syntax -- What a screen showed is only known by watching the cache while it's open, and it stays live only once the screen closes.
  useEffect(() => {
    const key = [address, conversationId, threadId ?? ""].join(" ");
    const cache = queryClient.getQueryCache();
    const shown = new Set(
      cache
        .findAll({ predicate: (query) => query.isActive() })
        .filter((query) => isAbout(query, address, conversationId))
        .map(({ queryHash }) => queryHash),
    );
    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== "observerAdded") return;
      const query = cache.get(event.query.queryHash);
      if (query !== undefined && isAbout(query, address, conversationId)) {
        shown.add(query.queryHash);
      }
    });
    // Once this screen's own queries are watched, after this commit.
    const takeOver = setTimeout(() => staying.get(key)?.(), 0);
    return () => {
      unsubscribe();
      clearTimeout(takeOver);
      // A window that won't open again as it was (see `windowReused`)
      // has nothing to keep its pages live for: scrolled far back, they
      // were dozens of queries, live for minutes.
      const reused = windowReused(queryClient, address, {
        conversationId,
        threadId,
      });
      stayLive(
        queryClient,
        key,
        [...shown]
          .flatMap((hash) => cache.get(hash) ?? [])
          .filter((query) => reused || !ofPages(query)),
      );
    };
  }, [queryClient, address, conversationId, threadId]);
}
