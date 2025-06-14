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
import { useRef, useState } from "react";

export default function ThreadList({
  preloadedThreads,
}: {
  preloadedThreads: Preloaded<typeof api.threads.getThreadList>;
}) {
  const threads = usePreloadedQuery(preloadedThreads);
  const [open, setOpen] = useState(false);
  const today = threads?.filter((item) => {
    const date = new Date(item._creationTime);
    return date.toDateString() === new Date().toDateString();
  });
  const yesterday = threads?.filter((item) => {
    const date = new Date(item._creationTime);
    return (
      date.toDateString() ===
      new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
    );
  });
  const lastWeek = threads?.filter((item) => {
    const date = new Date(item._creationTime);
    return (
      date.toDateString() ===
      new Date(new Date().setDate(new Date().getDate() - 7)).toDateString()
    );
  });
  const lastMonth = threads?.filter((item) => {
    const date = new Date(item._creationTime);
    return (
      date.toDateString() ===
      new Date(new Date().setMonth(new Date().getMonth() - 1)).toDateString()
    );
  });
  // const previousCreationDate = useRef(new Date());
  return (
    <>
      <SidebarGroup>
        <SidebarMenu className="gap-2">
          {today?.length > 0 && <SidebarGroupLabel>Today</SidebarGroupLabel>}
          {today?.map((item) => (
            <ThreadListItem
              key={item._id}
              title={item.title ?? ""}
              id={item._id ?? ""}
              handleDelete={() => setOpen(true)}
            />
          ))}
          {yesterday?.length > 0 && (
            <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
          )}
          {yesterday?.map((item) => (
            <ThreadListItem
              key={item._id}
              title={item.title ?? ""}
              id={item._id ?? ""}
              handleDelete={() => setOpen(true)}
            />
          ))}
          {lastWeek?.length > 0 && (
            <SidebarGroupLabel>Last Week</SidebarGroupLabel>
          )}
          {lastWeek?.map((item) => (
            <ThreadListItem
              key={item._id}
              title={item.title ?? ""}
              id={item._id ?? ""}
              handleDelete={() => setOpen(true)}
            />
          ))}
          {lastMonth?.length > 0 && (
            <SidebarGroupLabel>Last Month</SidebarGroupLabel>
          )}
          {lastMonth?.map((item) => (
            <ThreadListItem
              key={item._id}
              title={item.title ?? ""}
              id={item._id ?? ""}
              handleDelete={() => setOpen(true)}
            />
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <CustomAlert
        open={open}
        setOpen={setOpen}
        onConfirm={() => {}}
        title="Delete Thread"
        message="Are you sure you want to delete this thread?"
        destructive={true}
      />
    </>
  );
}
