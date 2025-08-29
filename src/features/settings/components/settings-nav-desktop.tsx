"use client";

import { Fragment } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut, MoveLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// import Socials from "@/components/socials";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { settingsTabs } from "@/features/settings/data";

export default function SettingsNavDesktop() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      variant="floating"
      className="bg-background hidden md:flex"
    >
      <SidebarContent>
        <SidebarMenu className="">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:text-primary hover:bg-card"
            >
              <Link href="/" prefetch={true}>
                <div className="flex items-center gap-2 ">
                  <MoveLeft className="h-4 w-4" />
                  <span>Back</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Separator className="my-1" />
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
                      prefetch={true}
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
              {index !== settingsTabs.length - 1 && (
                <Separator className="my-1" />
              )}
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
        {/* <Separator /> */}
        {/* <Socials /> */}
      </SidebarContent>
    </Sidebar>
  );
}
