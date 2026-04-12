import { useLocation } from "@tanstack/react-router";

import { ContextMenu, ContextMenuTrigger } from "@acme/ui/context-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@acme/ui/sidebar";

import type { ThreadGroup } from "../types";
import PageLoader from "~/components/page-loader";
import ThreadListContextItems from "./thread-list-context-items";
import ThreadListItem from "./thread-list-item";

const ThreadListSkeleton = () => {
  return (
    <SidebarMenuItem className="bg-border w-full animate-pulse rounded-md">
      <SidebarMenuButton className="py-5" />
    </SidebarMenuItem>
  );
};

export default function ThreadList({
  threadGroups,
  status,
  loadMore,
  noThreads,
  loaderId,
}: {
  threadGroups: ThreadGroup[];
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";
  loadMore: () => void;
  noThreads: boolean;
  loaderId: string | null;
}) {
  const { pathname } = useLocation();

  if (status === "LoadingFirstPage") {
    return (
      <SidebarGroup className="gap-2">
        {Array.from({ length: 50 }).map((_, index) => (
          <ThreadListSkeleton key={index} />
        ))}
      </SidebarGroup>
    );
  }

  if (noThreads) {
    return (
      <div className="flex w-full items-center justify-center py-4">
        <p className="text-muted-foreground text-sm">No threads found</p>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {threadGroups.map(
          (group) =>
            group.threads.length > 0 && (
              <SidebarGroup key={group.label} className="gap-1">
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                {group.threads.map((item) => {
                  const threadProps = {
                    title: item.title,
                    id: item.id,
                    active: pathname.includes(item.id),
                    status: item.state,
                    pinned: item.pinned === true,
                  };
                  // wrap item in invisible page loader
                  if (loaderId === item.id) {
                    return (
                      <PageLoader
                        key={item.id}
                        status={status}
                        loadMore={loadMore}
                        singleUse={true}
                      >
                        <ThreadListItem thread={threadProps} />
                      </PageLoader>
                    );
                  }
                  return <ThreadListItem key={item.id} thread={threadProps} />;
                })}
              </SidebarGroup>
            ),
        )}
      </ContextMenuTrigger>
      <ThreadListContextItems />
    </ContextMenu>
  );
}
