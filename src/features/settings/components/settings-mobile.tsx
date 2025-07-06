"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { settingsTabs } from "@/features/settings/data";
import { MoveLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { SignOutButton } from "@clerk/nextjs";

export default function SettingsMobile() {
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
}
