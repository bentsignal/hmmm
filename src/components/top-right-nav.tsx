"use client";

import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export default function TopRightNav() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  return (
    <div className={`bg-card m-4 flex w-fit items-center rounded-lg p-1`}>
      <Button
        variant="ghost"
        onClick={() => router.push("/settings")}
        size="icon"
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}
