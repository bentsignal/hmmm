import { SidebarProvider } from "@/components/ui/sidebar";
import SettingsNavDesktop from "@/features/settings/components/settings-nav-desktop";
import SettingsNavMobile from "@/features/settings/components/settings-nav-mobile";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div
        className="mx-auto mt-8 flex w-screen max-w-[1200px] flex-col gap-4 
        px-4 sm:max-h-screen md:mt-30 md:flex-row"
      >
        <SettingsNavMobile />
        <SettingsNavDesktop />
        <main className="flex flex-1 flex-col items-center">{children}</main>
      </div>
    </SidebarProvider>
  );
}
