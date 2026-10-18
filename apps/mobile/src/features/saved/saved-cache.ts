import type { QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { notifyManager, useQueryClient } from "@tanstack/react-query";

import type { Saved } from "./saved-files";
import { fieldOf } from "./fields";

/**
 * The queries showing saved results, by hash, each with the time its
 * result was set: once a live result replaces it, the time changes.
 */
const showingSaved = new Map<string, number>();

/** Whether cached PDS query data has a result to show. */
function hasResult(data: unknown) {
  const status = fieldOf(data, "status");
  return status === "partial" || status === "success";
}

/** What `liveResult` reads of a query. */
interface CachedQuery {
  readonly queryHash: string;
  readonly state: { readonly data: unknown; readonly dataUpdatedAt: number };
}

/** The result of a query answered completely, from the PDS. */
export function liveResult(query: CachedQuery | undefined) {
  if (query === undefined || isSaved(query)) return undefined;
  const { data } = query.state;
  return fieldOf(data, "status") === "success"
    ? { result: fieldOf(data, "result") }
    : undefined;
}

function isSaved(query: CachedQuery) {
  return showingSaved.get(query.queryHash) === query.state.dataUpdatedAt;
}

/**
 * Shows a screen's saved results in the queries that have none yet, until
 * their live ones replace them. Returns the queries it filled in.
 */
export function showSaved(queryClient: QueryClient, saved: Saved) {
  const cache = queryClient.getQueryCache();
  return saved.entries.flatMap(({ key, result }) => {
    if (hasResult(queryClient.getQueryData(key))) return [];
    queryClient.setQueryData(
      key,
      {
        federation: { sources: [], status: "success" },
        result,
        status: "success",
      },
      { updatedAt: saved.savedAt },
    );
    const query = cache.find({ exact: true, queryKey: key });
    if (query === undefined) return [];
    showingSaved.set(query.queryHash, query.state.dataUpdatedAt);
    return [query.queryHash];
  });
}

/**
 * Whether a screen still shows any of the saved results it filled in
 * (`filled`, from `showSaved`): a query it shows hasn't had its live
 * result yet.
 */
export function useShowingSaved(filled: readonly string[]) {
  const cache = useQueryClient().getQueryCache();
  return useSyncExternalStore(
    (onChange) =>
      // The cache tells its listeners about a query as it's created, which
      // can be while another component renders, so the change waits.
      cache.subscribe(({ query }) => {
        if (filled.includes(query.queryHash)) notifyManager.schedule(onChange);
      }),
    () =>
      filled.some((hash) => {
        const query = cache.get(hash);
        return query?.isActive() === true && isSaved(query);
      }),
  );
}
