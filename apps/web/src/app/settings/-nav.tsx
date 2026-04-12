import { Fragment, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { SignOutButton } from "@clerk/tanstack-react-start";
import { LogOut, MoveLeft } from "lucide-react";

import { QuickLink } from "@acme/features/quick-link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Separator } from "@acme/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@acme/ui/sidebar";

import { settingsTabs } from "~/app/settings/-tabs";
import { cn } from "~/lib/utils";

export const SettingsNavMobile = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(pathname);

  return (
    <div className="mb-4 flex flex-col items-center justify-center gap-4 md:hidden">
      <Select
        onValueChange={(value) => {
          setIsOpen(false);
          setValue(value);
          void navigate({ to: value });
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
      <QuickLink to="/" className="text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <MoveLeft className="h-4 w-4" />
          <span>Back to chat</span>
        </div>
      </QuickLink>
    </div>
  );
};

export const SettingsNavDesktop = () => {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="none" variant="floating" className="hidden md:flex">
      <SidebarContent>
        <SidebarMenu className="">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:text-primary hover:bg-card/50"
            >
              <QuickLink to="/" preload="render">
                <div className="flex items-center gap-2">
                  <MoveLeft className="h-4 w-4" />
                  <span>Back</span>
                </div>
              </QuickLink>
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
                    <QuickLink
                      to={tab.href}
                      preload="render"
                      className={cn(
                        "text-muted-foreground",
                        pathname === tab.href && "text-primary font-bold",
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </QuickLink>
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
