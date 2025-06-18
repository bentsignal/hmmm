"use client";

import {
  Sidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarContent,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";
import ThreadListItem from "./thread-list-item";
import CustomAlert from "@/components/alert";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import NewThreadButton from "./new-thread-button";
import { Input } from "@/components/ui/input";

export default function ThreadList({
  preloadedThreads,
}: {
  preloadedThreads: Preloaded<typeof api.threads.getThreadList>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const threads = usePreloadedQuery(preloadedThreads);
  const [open, setOpen] = useState(false);
  const selectedThread = useRef<string | null>(null);
  const { deleteThread } = useThreadMutation();

  // search threads
  const [search, setSearch] = useState("");
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      return thread.title?.toLowerCase().includes(search.toLowerCase());
    });
  }, [threads, search]);

  // fade in on load
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    if (threads.length > 0) {
      setOpacity(1);
    }
  }, [threads]);

  // group threads by creation date
  const {
    todaysThreads,
    yesterdayThreads,
    lastWeekThreads,
    lastMonthThreads,
    oldThreads,
  } = useMemo(() => {
    // get dates normalized to start of day
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

  return (
    <Sidebar variant="floating" className="py-4 pr-0 pl-4">
      <SidebarHeader className="md:px-auto flex flex-col items-center justify-between px-4 pt-4 md:pt-4">
        <NewThreadButton />
        <Input
          placeholder="Search"
          className=" w-full"
          onChange={(e) => setSearch(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent
        className="scrollbar-thin scrollbar-thumb-secondary 
        scrollbar-track-transparent overflow-y-auto"
      >
        <SidebarMenu
          className="transition-opacity duration-500 ease-in-out"
          style={{ opacity }}
        >
          {todaysThreads.length > 0 && (
            <SidebarGroup className="gap-1">
              <SidebarGroupLabel>Today</SidebarGroupLabel>
              {todaysThreads.map((item) => (
                <ThreadListItem
                  key={item._id}
                  title={item.title ?? ""}
                  id={item._id ?? ""}
                  handleDelete={() => {
                    setOpen(true);
                    selectedThread.current = item._id;
                  }}
                />
              ))}
            </SidebarGroup>
          )}
          {yesterdayThreads.length > 0 && (
            <SidebarGroup className="gap-1">
              <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
              {yesterdayThreads.map((item) => (
                <ThreadListItem
                  key={item._id}
                  title={item.title ?? ""}
                  id={item._id ?? ""}
                  handleDelete={() => {
                    setOpen(true);
                    selectedThread.current = item._id;
                  }}
                />
              ))}
            </SidebarGroup>
          )}
          {lastWeekThreads.length > 0 && (
            <SidebarGroup className="gap-1">
              <SidebarGroupLabel>Last Week</SidebarGroupLabel>
              {lastWeekThreads.map((item) => (
                <ThreadListItem
                  key={item._id}
                  title={item.title ?? ""}
                  id={item._id ?? ""}
                  handleDelete={() => {
                    setOpen(true);
                    selectedThread.current = item._id;
                  }}
                />
              ))}
            </SidebarGroup>
          )}
          {lastMonthThreads.length > 0 && (
            <SidebarGroup className="gap-1">
              <SidebarGroupLabel>Last Month</SidebarGroupLabel>
              {lastMonthThreads.map((item) => (
                <ThreadListItem
                  key={item._id}
                  title={item.title ?? ""}
                  id={item._id ?? ""}
                  handleDelete={() => {
                    setOpen(true);
                    selectedThread.current = item._id;
                  }}
                />
              ))}
            </SidebarGroup>
          )}
          {oldThreads.length > 0 && (
            <SidebarGroup className="gap-1">
              <SidebarGroupLabel>Old</SidebarGroupLabel>
              {oldThreads.map((item) => (
                <ThreadListItem
                  key={item._id}
                  title={item.title ?? ""}
                  id={item._id ?? ""}
                  handleDelete={() => {
                    setOpen(true);
                    selectedThread.current = item._id;
                  }}
                />
              ))}
            </SidebarGroup>
          )}
        </SidebarMenu>
        <CustomAlert
          open={open}
          setOpen={setOpen}
          onCancel={() => {
            selectedThread.current = null;
          }}
          onConfirm={() => {
            if (selectedThread.current) {
              if (pathname.includes(selectedThread.current)) {
                router.push("/");
              }
              deleteThread({ threadId: selectedThread.current });
              selectedThread.current = null;
            }
          }}
          title="Delete Thread"
          message="Are you sure you want to delete this thread?"
          destructive={true}
        />
      </SidebarContent>
    </Sidebar>
  );
}
