import { useMemo } from "react";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import useDebouncedInput from "@/hooks/use-debounced-input";

const PAGE_SIZE = 50;

export default function useThreadList() {
  // thread pagination
  const { setValue: setSearch, debouncedValue: debouncedSearch } =
    useDebouncedInput();
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { search: debouncedSearch } : "skip";
  const {
    results: threads,
    status,
    loadMore,
  } = usePaginatedQuery(api.thread.thread_queries.getThreadList, args, {
    initialNumItems: PAGE_SIZE,
  });
  const loadMoreThreads = () => loadMore(PAGE_SIZE);

  // group threads by creation date
  const {
    todaysThreads,
    yesterdayThreads,
    lastWeekThreads,
    lastMonthThreads,
    oldThreads,
  } = useMemo(() => {
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
    // filter threads by date range
    const todaysThreads = threads.filter((item) => {
      const itemDate = new Date(item.updatedAt);
      return itemDate >= today && itemDate < tomorrow;
    });
    const yesterdayThreads = threads.filter((item) => {
      const itemDate = new Date(item.updatedAt);
      return itemDate >= yesterday && itemDate < today;
    });
    const lastWeekThreads = threads.filter((item) => {
      const itemDate = new Date(item.updatedAt);
      return itemDate >= lastWeek && itemDate < yesterday;
    });
    const lastMonthThreads = threads.filter((item) => {
      const itemDate = new Date(item.updatedAt);
      return itemDate >= lastMonth && itemDate < lastWeek;
    });
    const oldThreads = threads.filter((item) => {
      const itemDate = new Date(item.updatedAt);
      return itemDate < lastMonth;
    });
    return {
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
      todaysThreads,
      yesterdayThreads,
      lastWeekThreads,
      lastMonthThreads,
      oldThreads,
    ],
  );

  return {
    status,
    loadMoreThreads,
    threads,
    threadGroups,
    setSearch,
  };
}
