"use client";

import CustomButton from "@/components/custom-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-1 flex-col items-center justify-center gap-4">
      <span className="text-4xl font-bold">QBE</span>
      <CustomButton
        loading={false}
        onClick={() => toast.success("Hello")}
        label="Click me"
      />
      <ThemeToggle />
    </div>
  );
}
