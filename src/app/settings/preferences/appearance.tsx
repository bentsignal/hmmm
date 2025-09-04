"use client";

import { themes, useTheme } from "@/providers/theme-provider";
import Cookies from "js-cookie";
import InfoCard from "@/components/info-card";
import { cn } from "@/lib/utils";

export default function Appearance() {
  console.log(Cookies.get());
  const { theme, changeTheme } = useTheme();
  return (
    <InfoCard title="Appearance">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {themes.map((value) => {
            return (
              <div
                key={value}
                className={cn(
                  "border-border size-12 cursor-pointer rounded-full select-none",
                  theme === value && "border-primary border-1",
                  `theme-${value}`,
                )}
                onClick={() => {
                  changeTheme(value);
                }}
              />
            );
          })}
        </div>
        {/* <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Stars</span>
          <Switch
            checked={stars}
            onCheckedChange={(checked) => {
              changeStars(checked);
            }}
          />
        </div> */}
      </div>
    </InfoCard>
  );
}
