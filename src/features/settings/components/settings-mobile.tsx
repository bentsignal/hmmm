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
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Fragment, useState } from "react";

export default function SettingsMobile() {
  const pathname = usePathname();
  const router = useRouter();

  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(pathname);

  return (
    <div className="mb-4 flex justify-center md:hidden">
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
          <SelectItem
            value="/"
            onClick={() => {
              if (isMobile) setIsOpen(false);
            }}
          >
            <Link href="/">
              <div className="flex items-center gap-2">
                <MoveLeft className="h-4 w-4" />
                <span>Back to chat</span>
              </div>
            </Link>
          </SelectItem>
          <SelectSeparator />
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
          <SelectItem value="/signout">
            <Link href="/">
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </div>
            </Link>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
