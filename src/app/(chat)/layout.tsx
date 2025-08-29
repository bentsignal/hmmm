import { SignedIn } from "@clerk/nextjs";
import { cookies } from "next/headers";
import ChatSidebar from "./chat-sidebar";
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
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME);
  const defaultOpen = sidebarState?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SignedIn>
        <ChatSidebar />
        <Library />
      </SignedIn>
      <SidebarInset className="relative h-screen">
        <SignedIn>
          <div className="absolute top-0 right-0 left-0 z-20 flex w-full items-center justify-between">
            <SidebarTrigger className="m-4 border p-5 shadow-md" />
          </div>
        </SignedIn>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
