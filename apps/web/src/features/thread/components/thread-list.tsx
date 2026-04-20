import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { LegendList } from "@legendapp/list/react";

import type { PureThread } from "@acme/features/thread";
import { ContextMenu, ContextMenuTrigger } from "@acme/ui/context-menu";
import {
  SidebarGroup,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@acme/ui/sidebar";

import { ThreadListContextItems } from "./thread-list-context-items";
import { ThreadListItem } from "./thread-list-item";

function ThreadListSkeleton() {
  return (
    <SidebarMenuItem className="bg-border w-full animate-pulse rounded-md">
      <SidebarMenuButton className="py-5" />
    </SidebarMenuItem>
  );
}

export function ThreadList({
  threads,
  status,
  loadMore,
  noThreads,
}: {
  threads: PureThread[];
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";
  loadMore: () => void;
  noThreads: boolean;
}) {
  const { pathname } = useLocation();

  const isDataReady = status !== "LoadingFirstPage";
  const [visible, setVisible] = useState(false);

  if (noThreads) {
    return (
      <div className="flex w-full items-center justify-center py-4">
        <p className="text-muted-foreground text-sm">No threads found</p>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="relative flex min-h-0 flex-1 flex-col">
        {!isDataReady && (
          <SidebarGroup className="absolute inset-0 gap-2 overflow-hidden">
            {Array.from({ length: 50 }).map((_, index) => (
              <ThreadListSkeleton key={index} />
            ))}
          </SidebarGroup>
        )}
        <LegendList
          data={threads}
          keyExtractor={(item) => item.id}
          estimatedItemSize={40}
          recycleItems
          extraData={pathname}
          onEndReached={loadMore}
          onEndReachedThreshold={3}
          onLoad={() => setVisible(true)}
          style={{
            flex: 1,
            minHeight: 0,
            opacity: visible ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
          contentContainerStyle={{
            paddingInline: 8,
            paddingTop: 6,
            paddingBottom: 8,
          }}
          renderItem={({ item }: { item: PureThread }) => (
            <div className="pb-0.5">
              <ThreadListItem
                thread={{
                  title: item.title,
                  id: item.id,
                  active:
                    pathname.includes(item.id) ||
                    (item.clientId !== undefined &&
                      pathname.includes(item.clientId)),
                  latestEvent: item.latestEvent,
                  pinned: item.pinned === true,
                }}
              />
            </div>
          )}
        />
      </ContextMenuTrigger>
      <ThreadListContextItems />
    </ContextMenu>
  );
}
