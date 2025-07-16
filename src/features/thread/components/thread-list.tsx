"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash } from "lucide-react";
import { usePathname } from "next/navigation";
import useThreadList from "../hooks/use-thread-list";
import useThreadStore from "../store";
import NewThreadButton from "./new-thread-button";
import ThreadDeleteModal from "./thread-delete-modal";
import ThreadListItem from "./thread-list-item";
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

  const triggerDeleteModal = useThreadStore(
    (state) => state.triggerDeleteModal,
  );

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
                        {group.threads.map((item) => (
                          <ThreadListItem
                            key={item.id}
                            title={item.title ?? ""}
                            id={item.id ?? ""}
                            status={item.state}
                            active={pathname.includes(item.id ?? "")}
                          />
                        ))}
                      </SidebarGroup>
                    ),
                )}
              </ContextMenu.ContextMenuTrigger>
              <ContextMenu.ContextMenuContent>
                <ContextMenu.ContextMenuItem onClick={triggerDeleteModal}>
                  <Trash className="h-4 w-4 text-destructive" />
                  Delete
                </ContextMenu.ContextMenuItem>
              </ContextMenu.ContextMenuContent>
            </ContextMenu.ContextMenu>
          )}
        </SidebarMenu>
        <PageLoader status={status} loadMore={loadMoreThreads}>
          {status !== "Exhausted" && status !== "LoadingFirstPage" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </PageLoader>
        <ThreadDeleteModal />
      </SidebarContent>
    </Sidebar>
  );
}
