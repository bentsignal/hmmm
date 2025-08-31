"use client";

import { Fragment, useState } from "react";
import { settingsTabs } from "@/app/settings/tabs";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut, MoveLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const SettingsNavMobile = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(pathname);

  return (
    <div className="mb-4 flex flex-col items-center justify-center gap-4 md:hidden">
      <Select
        onValueChange={(value) => {
          setIsOpen(false);
          setValue(value);
          router.push(value);
        }}
        value={value}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="w-full max-w-[300px]">
          <SelectValue placeholder="General" />
        </SelectTrigger>
        <SelectContent>
          {settingsTabs.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              {group.map((tab) => (
                <SelectItem key={tab.label} value={tab.href}>
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              ))}
              {groupIndex !== settingsTabs.length - 1 && <SelectSeparator />}
            </Fragment>
          ))}
          <SignOutButton>
            <SelectItem value="/">
              <span className="flex items-center gap-2 text-sm">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </span>
            </SelectItem>
          </SignOutButton>
        </SelectContent>
      </Select>
      <Link href="/" className="text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <MoveLeft className="h-4 w-4" />
          <span>Back to chat</span>
        </div>
      </Link>
    </div>
  );
};

export const SettingsNavDesktop = () => {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="none" variant="floating" className="hidden md:flex">
      <SidebarContent>
        <SidebarMenu className="">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:text-primary hover:bg-card/50"
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
                  className="hover:bg-card/50 rounded-md"
                >
                  <SidebarMenuButton
                    asChild
                    className={`${pathname === tab.href && "bg-card/50"}`}
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
};
