import { createFileRoute, Outlet } from "@tanstack/react-router";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@acme/ui/sidebar";

import ChatSidebar from "~/app/(chat)/-chat-sidebar";
import Library from "~/features/library";

export const Route = createFileRoute("/_chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const { auth, cookies } = Route.useRouteContext();
  const defaultOpen = cookies.sidebarOpen;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {auth?.isSignedIn && (
        <>
          <ChatSidebar />
          <Library />
        </>
      )}
      <SidebarInset className="relative h-screen">
        {auth?.isSignedIn && (
          <div className="absolute top-0 right-0 left-0 z-20 flex w-full items-center justify-between">
            <SidebarTrigger className="m-4 border p-5 shadow-md" />
          </div>
        )}
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
