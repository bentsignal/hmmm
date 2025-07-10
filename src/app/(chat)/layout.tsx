import { auth } from "@clerk/nextjs/server";
import TopRightNav from "@/components/top-right-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThreadList from "@/features/thread/components/thread-list";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  return (
    <SidebarProvider>
      {userId && <ThreadList />}
      <SidebarInset className="relative h-screen">
        {userId && (
          <>
            <div className="absolute top-0 right-0 left-0 z-50 flex w-full items-center justify-between">
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
