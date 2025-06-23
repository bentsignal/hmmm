"use client";

import {
  Sidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarContent,
} from "@/components/ui/sidebar";
import ThreadListItem from "./thread-list-item";
import { useEffect, useState } from "react";
import NewThreadButton from "./new-thread-button";
import { Input } from "@/components/ui/input";
import useThreadList from "../hooks/use-thread-list";
import ThreadDeleteModal from "./thread-delete-modal";
import PageLoader from "@/components/page-loader";
import { usePathname } from "next/navigation";

export default function ThreadList() {
  const pathname = usePathname();
  const { threads, threadGroups, setSearch, loadMoreThreads, status } =
    useThreadList();

  // fade in on load
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    if (threads.length > 0) {
      setOpacity(1);
    }
  }, [threads]);

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
          {threads.length === 0 && status !== "LoadingFirstPage" && (
            <div className="flex w-full items-center justify-center py-4">
              <p className="text-muted-foreground text-sm">No threads found</p>
            </div>
          )}
          {threadGroups.map(
            (group) =>
              group.threads.length > 0 && (
                <SidebarGroup key={group.label} className="gap-1">
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  {group.threads.map((item) => (
                    <ThreadListItem
                      key={item._id}
                      title={item.title ?? ""}
                      id={item.threadId ?? ""}
                      status={item.state}
                      active={pathname.includes(item.threadId)}
                    />
                  ))}
                </SidebarGroup>
              ),
          )}
        </SidebarMenu>
        <PageLoader status={status} loadMore={loadMoreThreads} />
        <ThreadDeleteModal />
      </SidebarContent>
    </Sidebar>
  );
}
