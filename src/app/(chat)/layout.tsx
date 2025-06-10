import Composer from "@/features/composer/components";
import TopRightNav from "@/components/top-right-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
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
      <SidebarInset>
        {userId && <SidebarTrigger className="m-4 p-4" />}
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-4">
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
            {children}
          </div>
          <Composer />
        </div>
      </SidebarInset>
      {userId && <TopRightNav />}
    </SidebarProvider>
  );
}
