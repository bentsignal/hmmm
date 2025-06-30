import { Separator } from "@/components/ui/separator";
import { MoveLeft, LogOut } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { settingsTabs } from "@/features/settings/data";

export default function SettingsDesktop() {
  return (
    <Sidebar
      collapsible="none"
      variant="floating"
      className="bg-background ml-20"
    >
      <SidebarContent className="justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <div className="flex items-center gap-2">
                  <MoveLeft className="h-4 w-4" />
                  <span>Back to chat</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Separator />
          {settingsTabs.map((group, index) => (
            <>
              {group.map((tab) => (
                <SidebarMenuItem key={tab.label} className="hover:bg-green-600">
                  <SidebarMenuButton asChild>
                    <Link href={tab.href} className="text-muted-foreground">
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {index !== settingsTabs.length - 1 && <Separator />}
            </>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/signout" className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
