"use client";

import { memo } from "react";
import { Brain } from "lucide-react";
import Link from "next/link";
import { ThreadListItemProps } from "../types";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import useThreadStore from "@/features/thread/store";

function ThreadListItem({ title, id, active, status }: ThreadListItemProps) {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const setHoveredThread = useThreadStore((state) => state.setHoveredThread);

  return (
    <SidebarMenuItem
      key={id}
      onMouseEnter={() => setHoveredThread(id)}
      className="hover:bg-primary/10 rounded-md transition-background-color duration-100"
    >
      <SidebarMenuButton
        asChild
        className="py-5"
        style={{
          WebkitMaskImage: "linear-gradient(to right, black 75%, transparent)",
          maskImage: "linear-gradient(to right, black 75%, transparent)",
        }}
        onClick={() => {
          if (isMobile) {
            toggleSidebar();
          }
        }}
      >
        <Link
          href={`/chat/${id}`}
          prefetch={true}
          className={cn(
            "font-medium whitespace-nowrap",
            active && "bg-primary/10",
          )}
        >
          {
            <div className="flex items-center gap-2">
              {(status === "streaming" || status === "waiting") && (
                <Brain className="text-muted-foreground h-4 w-4 animate-pulse" />
              )}
              {title !== "New Chat" && title}
            </div>
          }
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default memo(ThreadListItem);
