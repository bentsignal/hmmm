import Composer from "@/features/composer/components";
import TopRightNav from "@/components/top-right-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@clerk/nextjs/server";
import BetaPopup from "@/features/beta/components/beta-popup";
import ErrorBoundary from "@/components/error-boundary";
import ThreadList from "@/features/thread/components/thread-list";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  return (
    <SidebarProvider>
      {userId && <BetaPopup />}
      {userId && <ThreadList />}
      <SidebarInset className="relative h-screen">
        {userId && (
          <>
            <div className="absolute top-0 right-0 left-0 z-50 flex w-full items-center justify-between">
              <SidebarTrigger className="m-4 border p-5 shadow-md" />
              <TopRightNav />
            </div>
            <div className="absolute right-0 bottom-0 left-0 z-50">
              <ErrorBoundary>
                <Composer />
              </ErrorBoundary>
            </div>
          </>
        )}
        <div className="h-full">
          <div className="flex h-full w-full flex-1 flex-col items-center justify-start">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
