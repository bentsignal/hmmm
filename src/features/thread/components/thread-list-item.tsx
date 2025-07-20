import { memo } from "react";
import { Brain } from "lucide-react";
import Link from "next/link";
import { Thread } from "../types";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import useThreadStore from "@/features/thread/store";

function ThreadListItem({ thread }: { thread: Thread }) {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const setHoveredThread = useThreadStore((state) => state.setHoveredThread);

  return (
    <SidebarMenuItem
      key={thread.id}
      onMouseEnter={() => setHoveredThread(thread)}
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
          href={`/chat/${thread.id}`}
          prefetch={true}
          className={cn(
            "font-medium whitespace-nowrap",
            thread.active && "bg-primary/10",
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

export default memo(ThreadListItem);
