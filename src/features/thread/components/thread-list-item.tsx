"use client";

import { memo, useState } from "react";
import { Brain, Trash } from "lucide-react";
import Link from "next/link";
import { ThreadListItemProps } from "../types";
import { Button } from "@/components/ui/button";
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
  const [isHovering, setIsHovering] = useState(false);

  const setDeleteModalOpen = useThreadStore(
    (state) => state.setDeleteModalOpen,
  );
  const setSelectedThread = useThreadStore((state) => state.setSelectedThread);

  return (
    <SidebarMenuItem
      key={id}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="hover:bg-primary/10 rounded-md"
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
      {isHovering && !isMobile && (
        <div
          className="bg-sidebar absolute top-0 right-0 flex h-full items-center
          justify-end pl-6"
          style={{
            WebkitMaskImage: "linear-gradient(to left, black 75%, transparent)",
            maskImage: "linear-gradient(to left, black 75%, transparent)",
          }}
        >
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              setSelectedThread(id);
              setDeleteModalOpen(true);
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}
    </SidebarMenuItem>
  );
}

export default memo(ThreadListItem);
