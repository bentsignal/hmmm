"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import useThreadList from "../hooks/use-thread-list";
import useThreadSwitch from "../hooks/use-thread-switch";
import NewThreadButton from "./new-thread-button";
import ThreadDeleteModal from "./thread-delete-modal";
import ThreadListContextItems from "./thread-list-context-items";
import ThreadListItem from "./thread-list-item";
import ThreadRenameModal from "./thread-rename-modal";
import PageLoader from "@/components/page-loader";
import * as ContextMenu from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { shortcuts } from "@/features/shortcuts";
import useShortcut from "@/features/shortcuts/hooks/use-shortcut";

export default function ThreadList() {
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    threads,
    threadGroups,
    setSearch,
    loadMoreThreads,
    status,
    loaderId,
  } = useThreadList();

  // switch between threads with tab and shift tab
  useThreadSwitch({
    threads,
  });

  // fade in on load
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    if (threads.length > 0) {
      setOpacity(1);
    }
  }, [threads]);

  // focus search on "ctrl/cmd + shift + ?"
  useShortcut({
    hotkey: shortcuts["search"].hotkey,
    callback: () => {
      if (searchRef.current) {
        searchRef.current.focus();
      }
    },
  });

  return (
    <Sidebar variant="floating" className="py-4 pr-0 pl-4">
      <SidebarHeader className="md:px-auto flex flex-col items-center justify-between px-4 pt-4 md:pt-4">
        <NewThreadButton />
        <Input
          placeholder="Search"
          className=" w-full"
          onChange={(e) => setSearch(e.target.value)}
          ref={searchRef}
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
          {threads.length === 0 && status !== "LoadingFirstPage" ? (
            <div className="flex w-full items-center justify-center py-4">
              <p className="text-muted-foreground text-sm">No threads found</p>
            </div>
          ) : (
            <ContextMenu.ContextMenu>
              <ContextMenu.ContextMenuTrigger>
                {threadGroups.map(
                  (group) =>
                    group.threads.length > 0 && (
                      <SidebarGroup key={group.label} className="gap-1">
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        {group.threads.map((item) => {
                          const thread = (
                            <ThreadListItem
                              key={item.id}
                              thread={{
                                title: item.title,
                                id: item.id,
                                active: pathname.includes(item.id ?? ""),
                                status: item.state,
                                pinned: item.pinned === true,
                              }}
                            />
                          );
                          // wrap item in invisible page loader
                          if (loaderId === item.id) {
                            return (
                              <PageLoader
                                key={item.id}
                                status={status}
                                loadMore={loadMoreThreads}
                                singleUse={true}
                              >
                                {thread}
                              </PageLoader>
                            );
                          }
                          return thread;
                        })}
                      </SidebarGroup>
                    ),
                )}
              </ContextMenu.ContextMenuTrigger>
              <ThreadListContextItems />
            </ContextMenu.ContextMenu>
          )}
        </SidebarMenu>
        <ThreadDeleteModal />
        <ThreadRenameModal />
      </SidebarContent>
    </Sidebar>
  );
}
