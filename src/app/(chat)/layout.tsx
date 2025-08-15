import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import ChatSidebar from "./chat-sidebar";
import TopRightNav from "@/components/top-right-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SIDEBAR_COOKIE_NAME } from "@/lib/cookies";
import Library from "@/features/library";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME);
  const defaultOpen = sidebarState?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {userId && <ChatSidebar />}
      {userId && <Library />}
      <SidebarInset className="relative h-screen">
        {userId && (
          <>
            <div className="absolute top-0 right-0 left-0 z-100 flex w-full items-center justify-between">
              <SidebarTrigger className="m-4 border p-5 shadow-md" />
              <TopRightNav />
            </div>
          </>
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
