import Composer from "@/features/composer/components";
import TopRightNav from "@/components/top-right-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import { auth } from "@clerk/nextjs/server";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  return (
    <SidebarProvider>
      {userId && <AppSidebar />}
      <SidebarInset className="relative h-screen">
        {userId && (
          <>
            <div className="absolute top-0 right-0 left-0 z-50 flex w-full items-center justify-between">
              <SidebarTrigger className="m-4 p-4" />
              <TopRightNav />
            </div>
            <div className="absolute right-0 bottom-0 left-0 z-50">
              <Composer />
            </div>
          </>
        )}
        <div className="h-full min-h-screen overflow-y-auto pt-20 pb-20">
          <div
            className="flex min-h-full w-full flex-1 flex-col 
          items-center justify-start gap-4"
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
