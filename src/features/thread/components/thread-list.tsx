"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ThreadList({
  preloadedThreads,
}: {
  preloadedThreads: Preloaded<typeof api.threads.getThreadList>;
}) {
  const threads = usePreloadedQuery(preloadedThreads);
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {threads?.map((item) => (
          <SidebarMenuItem key={item._id}>
            <SidebarMenuButton
              asChild
              className="py-5"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 75%, transparent)",
                maskImage: "linear-gradient(to right, black 75%, transparent)",
              }}
              onClick={() => {
                if (isMobile) {
                  toggleSidebar();
                }
              }}
            >
              <Link
                href={`/chat/${item._id}`}
                className={cn(
                  "font-medium whitespace-nowrap",
                  pathname.endsWith(item._id) && "bg-accent",
                )}
              >
                {item.title}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
