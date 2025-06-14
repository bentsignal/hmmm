"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";
import ThreadListItem from "./thread-list-item";
import CustomAlert from "@/components/alert";
import { Fragment, useMemo, useRef, useState } from "react";
// import { useMutation } from "convex/react";

export default function ThreadList({
  preloadedThreads,
}: {
  preloadedThreads: Preloaded<typeof api.threads.getThreadList>;
}) {
  const threads = usePreloadedQuery(preloadedThreads);
  const [open, setOpen] = useState(false);
  const selectedThread = useRef<string | null>(null);
  // const deleteAllForThreadIdSync = useMutation(
  //   api.threads.deleteAllForThreadIdSync,
  // );

  // group threads by creation date
  const threadGroupCounts = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    let todayCount = 0,
      yesterdayCount = 0,
      lastWeekCount = 0,
      lastMonthCount = 0;
    threads?.forEach((item) => {
      const itemDate = new Date(item._creationTime);
      if (itemDate.toDateString() === today.toDateString()) {
        todayCount++;
      }
      if (itemDate >= lastMonth) {
        lastMonthCount++;
      }
      if (itemDate >= lastWeek) {
        lastWeekCount++;
      }
      if (itemDate >= yesterday) {
        yesterdayCount++;
      }
    });
    return {
      todayCount,
      yesterdayCount,
      lastWeekCount,
      lastMonthCount,
    };
  }, [threads]);

  return (
    <>
      <SidebarGroup>
        <SidebarMenu className="gap-2">
          {threads?.map((item, i) => (
            <Fragment key={i}>
              {i === 0 ? (
                <SidebarGroupLabel>Today</SidebarGroupLabel>
              ) : i === threadGroupCounts.todayCount ? (
                <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
              ) : i === threadGroupCounts.yesterdayCount ? (
                <SidebarGroupLabel>Last 7 Days</SidebarGroupLabel>
              ) : i === threadGroupCounts.lastWeekCount ? (
                <SidebarGroupLabel>Last 30 Days</SidebarGroupLabel>
              ) : i === threadGroupCounts.lastMonthCount ? (
                <SidebarGroupLabel>Older than 30 days</SidebarGroupLabel>
              ) : null}
              <ThreadListItem
                key={item._id}
                title={item.title ?? ""}
                id={item._id ?? ""}
                handleDelete={() => {
                  setOpen(true);
                  selectedThread.current = item._id;
                }}
              />
            </Fragment>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <CustomAlert
        open={open}
        setOpen={setOpen}
        onCancel={() => {
          setOpen(false);
          selectedThread.current = null;
        }}
        onConfirm={() => {
          // if (selectedThread.current) {
          //   api.threads.deleteAllForThreadIdSync({
          //     threadId: selectedThread.current,
          //   });
          // }
        }}
        title="Delete Thread"
        message="Are you sure you want to delete this thread?"
        destructive={true}
      />
    </>
  );
}
