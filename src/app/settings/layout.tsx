import { SettingsNavDesktop, SettingsNavMobile } from "./nav";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div
        className="mx-auto flex w-screen max-w-[1200px] flex-col gap-4 px-4 
        pt-8 sm:max-h-screen md:flex-row md:pt-30"
      >
        <SettingsNavMobile />
        <SettingsNavDesktop />
        <main className="flex flex-1 flex-col items-center">{children}</main>
      </div>
    </SidebarProvider>
  );
}
