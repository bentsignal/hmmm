// eslint-disable-next-line no-restricted-imports -- useQuery is needed here for preloaded first-page cache before switching to live Convex query
import { useQuery } from "@tanstack/react-query";
import { useConvexAuth, usePaginatedQuery } from "convex/react";

import { api } from "@acme/db/api";

import type { PureThread, ThreadGroup } from "../types/thread-types";
import { useDebouncedInput } from "../../hooks/use-debounced-input";
import { threadQueries } from "../../lib/queries";
import {
  INITIAL_PAGE_SIZE,
  INVISIBLE_PAGE_LOADER_INDEX,
  PAGE_SIZE,
} from "../config/thread-config";

function getDateBoundaries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return { today, yesterday, lastWeek, lastMonth, tomorrow };
}

function categorizeThread(
  itemDate: Date,
  boundaries: ReturnType<typeof getDateBoundaries>,
) {
  const { today, yesterday, lastWeek, lastMonth, tomorrow } = boundaries;
  if (itemDate >= today && itemDate < tomorrow) return "today";
  if (itemDate >= yesterday && itemDate < today) return "yesterday";
  if (itemDate >= lastWeek && itemDate < yesterday) return "lastWeek";
  if (itemDate >= lastMonth && itemDate < lastWeek) return "lastMonth";
  return "old";
}

function groupThreads(threads: PureThread[]) {
  const boundaries = getDateBoundaries();

  const pinnedThreads = [];
  const todaysThreads = [];
  const yesterdayThreads = [];
  const lastWeekThreads = [];
  const lastMonthThreads = [];
  const oldThreads = [];

  for (const item of threads) {
    if (item.pinned) {
      pinnedThreads.push(item);
      continue;
    }
    const category = categorizeThread(
      new Date(item.updatedAt ?? 0),
      boundaries,
    );
    if (category === "today") todaysThreads.push(item);
    else if (category === "yesterday") yesterdayThreads.push(item);
    else if (category === "lastWeek") lastWeekThreads.push(item);
    else if (category === "lastMonth") lastMonthThreads.push(item);
    else oldThreads.push(item);
  }

  return {
    pinnedThreads,
    todaysThreads,
    yesterdayThreads,
    lastWeekThreads,
    lastMonthThreads,
    oldThreads,
  };
}

function buildThreadGroups(grouped: ReturnType<typeof groupThreads>) {
  return [
    { label: "Pinned", threads: grouped.pinnedThreads },
    { label: "Today", threads: grouped.todaysThreads },
    { label: "Yesterday", threads: grouped.yesterdayThreads },
    { label: "Last 7 Days", threads: grouped.lastWeekThreads },
    { label: "Last 30 Days", threads: grouped.lastMonthThreads },
    { label: "Older than 30 Days", threads: grouped.oldThreads },
  ];
}

function getLoaderId(threadGroups: ThreadGroup[]) {
  const flattenedThreads = threadGroups.flatMap((group) => group.threads);
  if (flattenedThreads.length < INVISIBLE_PAGE_LOADER_INDEX) {
    return null;
  }
  const loaderThread =
    flattenedThreads[flattenedThreads.length - INVISIBLE_PAGE_LOADER_INDEX];
  if (!loaderThread) {
    return null;
  }
  return loaderThread.id;
}

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

  function loadMoreThreads() {
    if (shouldUseLiveResults) {
      liveQuery.loadMore(PAGE_SIZE);
    }
  }

  const grouped = groupThreads(threads);
  const threadGroups = buildThreadGroups(grouped);
  const flattenedThreads = threadGroups.flatMap((group) => group.threads);
  const loaderId = getLoaderId(threadGroups);

  return {
    pinnedThreads: grouped.pinnedThreads,
    status,
    loadMoreThreads,
    threads: flattenedThreads,
    threadGroups,
    setSearch,
    loaderId,
  };
}
