"use client";

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
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@clerk/nextjs";

export default function SettingsDesktop() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      variant="floating"
      className="bg-background hidden md:flex"
    >
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:text-primary hover:bg-card"
            >
              <Link href="/">
                <div className="flex items-center gap-2 ">
                  <MoveLeft className="h-4 w-4" />
                  <span>Back to chat</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Separator />
          {settingsTabs.map((group, index) => (
            <Fragment key={index}>
              {group.map((tab) => (
                <SidebarMenuItem
                  key={tab.label}
                  className="hover:bg-card rounded-md"
                >
                  <SidebarMenuButton
                    asChild
                    className={`${pathname === tab.href && "bg-card"}`}
                  >
                    <Link
                      href={tab.href}
                      className={cn(
                        "text-muted-foreground",
                        pathname === tab.href && "text-primary font-bold",
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {index !== settingsTabs.length - 1 && <Separator />}
            </Fragment>
          ))}
          <SidebarMenuItem>
            <SignOutButton>
              <SidebarMenuButton asChild className="text-muted-foreground">
                <span className="flex items-center gap-2 hover:cursor-pointer">
                  <LogOut />
                  <span>Sign out</span>
                </span>
              </SidebarMenuButton>
            </SignOutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
