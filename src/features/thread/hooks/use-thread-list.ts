import { useMemo } from "react";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import useDebouncedInput from "@/hooks/use-debounced-input";
import {
  INITIAL_PAGE_SIZE,
  INVISIBLE_PAGE_LOADER_INDEX,
  PAGE_SIZE,
} from "@/features/thread/config";

// Cache date boundaries outside component to avoid recalculation
const getDateBoundaries = () => {
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
};

export default function useThreadList() {
  const { setValue: setSearch, debouncedValue: debouncedSearch } =
    useDebouncedInput();

  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { search: debouncedSearch } : "skip";
  const {
    results: threads,
    status,
    loadMore,
  } = usePaginatedQuery(api.ai.thread.getThreadList, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
  });

  const loadMoreThreads = () => loadMore(PAGE_SIZE);

  // group threads by pin status & creation date
  const {
    pinnedThreads,
    todaysThreads,
    yesterdayThreads,
    lastWeekThreads,
    lastMonthThreads,
    oldThreads,
  } = useMemo(() => {
    const { today, yesterday, lastWeek, lastMonth, tomorrow } =
      getDateBoundaries();

    const pinnedThreads = [];
    const todaysThreads = [];
    const yesterdayThreads = [];
    const lastWeekThreads = [];
    const lastMonthThreads = [];
    const oldThreads = [];

    for (const item of threads) {
      const itemDate = new Date(item.updatedAt);

      if (item.pinned) {
        pinnedThreads.push(item);
      } else if (itemDate >= today && itemDate < tomorrow) {
        todaysThreads.push(item);
      } else if (itemDate >= yesterday && itemDate < today) {
        yesterdayThreads.push(item);
      } else if (itemDate >= lastWeek && itemDate < yesterday) {
        lastWeekThreads.push(item);
      } else if (itemDate >= lastMonth && itemDate < lastWeek) {
        lastMonthThreads.push(item);
      } else {
        oldThreads.push(item);
      }
    }

    return {
      pinnedThreads,
      todaysThreads,
      yesterdayThreads,
      lastWeekThreads,
      lastMonthThreads,
      oldThreads,
    };
  }, [threads]);

  // pack grouped threads into one array
  const threadGroups = useMemo(
    () => [
      {
        label: "Pinned",
        threads: pinnedThreads,
      },
      {
        label: "Today",
        threads: todaysThreads,
      },
      {
        label: "Yesterday",
        threads: yesterdayThreads,
      },
      {
        label: "Last 7 Days",
        threads: lastWeekThreads,
      },
      {
        label: "Last 30 Days",
        threads: lastMonthThreads,
      },
      {
        label: "Older than 30 Days",
        threads: oldThreads,
      },
    ],
    [
      pinnedThreads,
      todaysThreads,
      yesterdayThreads,
      lastWeekThreads,
      lastMonthThreads,
      oldThreads,
    ],
  );

  const flattenedThreads = useMemo(
    () => threadGroups.flatMap((group) => group.threads),
    [threadGroups],
  );

  const loaderId = useMemo(() => {
    if (flattenedThreads.length < INVISIBLE_PAGE_LOADER_INDEX) {
      return null;
    }
    return flattenedThreads[
      flattenedThreads.length - INVISIBLE_PAGE_LOADER_INDEX
    ].id;
  }, [flattenedThreads]);

  return {
    pinnedThreads,
    status,
    loadMoreThreads,
    threads: flattenedThreads,
    threadGroups,
    setSearch,
    loaderId,
  };
}
