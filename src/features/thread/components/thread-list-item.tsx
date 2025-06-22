"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Brain, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, memo } from "react";
import useThreadStore from "@/features/thread/store";
import { Doc } from "@/convex/_generated/dataModel";

interface ThreadListItemProps {
  title: string;
  id: string;
  status: Doc<"threadMetadata">["state"];
}

function ThreadListItem({ title, id, status }: ThreadListItemProps) {
  const pathname = usePathname();
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
            pathname.endsWith(id) && "bg-primary/10",
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
