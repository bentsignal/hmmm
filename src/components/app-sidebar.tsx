import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import ThreadList from "@/features/thread/components/thread-list";
import NewThreadButton from "@/features/thread/components/new-thread-button";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function AppSidebar() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const preloadedThreads = await preloadQuery(api.threads.getThreadList);

  return (
    <Sidebar variant="floating" className="py-4 pr-0 pl-4">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <NewThreadButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        className="scrollbar-thin scrollbar-thumb-secondary 
        scrollbar-track-transparent overflow-y-auto"
      >
        <ThreadList preloadedThreads={preloadedThreads} />
      </SidebarContent>
    </Sidebar>
  );
}
