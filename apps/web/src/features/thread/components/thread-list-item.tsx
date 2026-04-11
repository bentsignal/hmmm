import { memo } from "react";
import { Link } from "@tanstack/react-router";
import equal from "fast-deep-equal";
import { Brain } from "lucide-react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@acme/ui/sidebar";
import useThreadStore from "~/features/thread/store";
import { useIsMobile } from "@acme/ui/hooks/use-mobile";
import { cn } from "~/lib/utils";
import { Thread } from "../types";

function ThreadListItem({ thread }: { thread: Thread }) {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const setHoveredThread = useThreadStore((state) => state.setHoveredThread);

  return (
    <SidebarMenuItem
      key={thread.id}
      onMouseEnter={() => setHoveredThread(thread)}
      className="hover:bg-border transition-background-color w-full rounded-md duration-100"
    >
      <SidebarMenuButton
        asChild
        className="mask-r-from-75% py-5"
        onClick={() => {
          if (isMobile) {
            toggleSidebar();
          }
        }}
      >
        <Link
          to="/chat/$id"
          params={{ id: thread.id }}
          preload="intent"
          className={cn(
            "font-medium whitespace-nowrap",
            thread.active && "bg-border",
          )}
        >
          {
            <div className="flex items-center gap-2">
              {(thread.status === "streaming" ||
                thread.status === "waiting") && (
                <Brain className="text-muted-foreground h-4 w-4 animate-pulse" />
              )}
              {thread.title !== "New Chat" && thread.title}
            </div>
          }
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default memo(ThreadListItem, (prev, next) => {
  return equal(prev.thread, next.thread);
});
