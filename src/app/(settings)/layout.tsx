import { SidebarProvider } from "@/components/ui/sidebar";
import SettingsDesktop from "@/features/settings/components/settings-desktop";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex w-screen bg-red-500 sm:max-h-screen">
        <SettingsDesktop />
        <main className="flex flex-1 flex-col items-center justify-center">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
