import { SidebarProvider } from "@/components/ui/sidebar";
import SettingsDesktop from "@/features/settings/components/settings-desktop";
import SettingsMobile from "@/features/settings/components/settings-mobile";

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
        <SettingsMobile />
        <SettingsDesktop />
        <main className="flex flex-1 flex-col items-center">{children}</main>
      </div>
    </SidebarProvider>
  );
}
