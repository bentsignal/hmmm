import { useEffect, useRef } from "react";
// eslint-disable-next-line no-restricted-imports -- useQuery reads the SSR-prefetched first page so the sidebar renders real threads on first paint instead of the skeleton
import { useQuery } from "@tanstack/react-query";
import { useConvexAuth, usePaginatedQuery } from "convex/react";

import { api } from "@acme/db/api";

import { useDebouncedInput } from "../../hooks/use-debounced-input";
import { threadQueries } from "../../lib/queries";
import { INITIAL_PAGE_SIZE, PAGE_SIZE } from "../config/thread-config";

export function useThreadList() {
  const { setValue: setSearch, debouncedValue: debouncedSearch } =
    useDebouncedInput();

  const { isAuthenticated } = useConvexAuth();

  const firstPageQuery = useQuery({
    ...threadQueries.listFirstPage(debouncedSearch),
    select: (data) => ({ page: data.page, isDone: data.isDone }),
  });

  const args = isAuthenticated ? { search: debouncedSearch } : "skip";
  const liveQuery = usePaginatedQuery(
    api.ai.thread.queries.getThreadList,
    args,
    {
      initialNumItems: INITIAL_PAGE_SIZE,
    },
  );

  const shouldUseLiveResults = liveQuery.status !== "LoadingFirstPage";
  const threads = shouldUseLiveResults
    ? liveQuery.results
    : (firstPageQuery.data?.page ?? []);
  const status = shouldUseLiveResults
    ? liveQuery.status
    : firstPageQuery.data?.isDone
      ? ("Exhausted" as const)
      : firstPageQuery.isLoading
        ? ("LoadingFirstPage" as const)
        : ("CanLoadMore" as const);

  // `onEndReached` fires on LegendList's very first layout, which often lands
  // before the live Convex query has exited `LoadingFirstPage`. Dropping that
  // request would wedge infinite scroll: because the prefetched first page
  // and the live query's first page are the same size, the handoff doesn't
  // change `contentSize`/`dataLength`, so LegendList's sticky end-reached
  // snapshot never invalidates and never re-fires. Stash the request and
  // flush it once the live query is ready.
  const pendingLoadMore = useRef(false);
  function loadMoreThreads() {
    if (shouldUseLiveResults) {
      liveQuery.loadMore(PAGE_SIZE);
    } else {
      pendingLoadMore.current = true;
    }
  }
  // eslint-disable-next-line no-restricted-syntax -- Syncs the deferred pagination request above with Convex's live query once it exits LoadingFirstPage; there is no render-time signal for that external transition.
  useEffect(() => {
    if (shouldUseLiveResults && pendingLoadMore.current) {
      pendingLoadMore.current = false;
      liveQuery.loadMore(PAGE_SIZE);
    }
  }, [shouldUseLiveResults, liveQuery]);

  return {
    status,
    loadMoreThreads,
    threads,
    setSearch,
  };
}
