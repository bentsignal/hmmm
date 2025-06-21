import { useMemo, useState } from "react";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 100;

export default function useThreadList() {
  // thread pagination
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    results: threads,
    status,
    loadMore,
  } = usePaginatedQuery(api.threads.getThreadList, args, {
    initialNumItems: PAGE_SIZE,
  });
  const loadMoreThreads = () => loadMore(PAGE_SIZE);

  // search for thread by title
  const [search, setSearch] = useState("");
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      return thread.title?.toLowerCase().includes(search.toLowerCase());
    });
  }, [threads, search]);

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
    const todaysThreads = filteredThreads.filter((item) => {
      const itemDate = new Date(item._creationTime);
      return itemDate >= today && itemDate < tomorrow;
    });
    const yesterdayThreads = filteredThreads.filter((item) => {
      const itemDate = new Date(item._creationTime);
      return itemDate >= yesterday && itemDate < today;
    });
    const lastWeekThreads = filteredThreads.filter((item) => {
      const itemDate = new Date(item._creationTime);
      return itemDate >= lastWeek && itemDate < yesterday;
    });
    const lastMonthThreads = filteredThreads.filter((item) => {
      const itemDate = new Date(item._creationTime);
      return itemDate >= lastMonth && itemDate < lastWeek;
    });
    const oldThreads = filteredThreads.filter((item) => {
      const itemDate = new Date(item._creationTime);
      return itemDate < lastMonth;
    });
    return {
      todaysThreads,
      yesterdayThreads,
      lastWeekThreads,
      lastMonthThreads,
      oldThreads,
    };
  }, [filteredThreads]);

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
    filteredThreads,
    threadGroups,
    setSearch,
  };
}
