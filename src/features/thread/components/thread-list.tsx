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

export default function ThreadList({
  preloadedThreads,
}: {
  preloadedThreads: Preloaded<typeof api.threads.get>;
}) {
  const threads = usePreloadedQuery(preloadedThreads);
  const pathname = usePathname();
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {threads?.map((item) => (
          <SidebarMenuItem key={item.threadId}>
            <SidebarMenuButton
              asChild
              className="py-5"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 75%, transparent)",
                maskImage: "linear-gradient(to right, black 75%, transparent)",
              }}
            >
              <Link
                href={`/chat/${item.threadId}`}
                className={cn(
                  "font-medium whitespace-nowrap",
                  pathname.endsWith(item.threadId) && "bg-accent",
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
