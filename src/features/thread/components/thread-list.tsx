"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";

export default function ThreadList({
  preloadedThreads,
}: {
  preloadedThreads: Preloaded<typeof api.threads.get>;
}) {
  const threads = usePreloadedQuery(preloadedThreads);
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {threads?.map((item) => (
          <SidebarMenuItem key={item._id}>
            <SidebarMenuButton asChild className="py-5">
              <a href={`/chat/${item._id}`} className="font-medium">
                {item.title} {item.count ?? 0}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
