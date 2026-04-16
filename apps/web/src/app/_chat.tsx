import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { LoginModal } from "@acme/features/auth";
import { threadQueries } from "@acme/features/lib/queries";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@acme/ui/sidebar";

import { ChatSidebar } from "~/app/(chat)/-chat-sidebar";
import { Library } from "~/features/library/library";

export const Route = createFileRoute("/_chat")({
  validateSearch: z.object({
    signin: z.boolean().optional(),
    redirect_url: z.string().optional(),
  }),
  component: ChatLayout,
  loader: async ({ context }) => {
    if (context.auth.isSignedIn) {
      await context.queryClient.ensureQueryData(threadQueries.listFirstPage());
    }
  },
});

function ChatLayout() {
  const { auth, cookies } = Route.useRouteContext({
    select: (ctx) => ({ auth: ctx.auth, cookies: ctx.cookies }),
  });
  const signin = Route.useSearch({ select: (s) => s.signin ?? false });
  const redirectUrl = Route.useSearch({ select: (s) => s.redirect_url });
  const navigate = useNavigate();
  const defaultOpen = cookies.sidebarOpen;

  function closeLoginModal() {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        signin: undefined,
        redirect_url: undefined,
      }),
    });
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {auth.isSignedIn && (
        <>
          <ChatSidebar />
          <Library />
        </>
      )}
      <SidebarInset className="relative h-screen">
        {auth.isSignedIn && (
          <div className="absolute top-0 right-0 left-0 z-20 flex w-full items-center justify-between">
            <SidebarTrigger className="m-4 border p-5 shadow-md" />
          </div>
        )}
        <Outlet />
      </SidebarInset>
      <LoginModal
        open={!auth.isSignedIn && signin}
        onClose={closeLoginModal}
        redirectUri={redirectUrl}
        tosURL="/terms-of-service"
        privacyURL="/privacy-policy"
      />
    </SidebarProvider>
  );
}
