"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Back({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <X
      onClick={() => router.back()}
      className={cn("hover:cursor-pointer", className)}
    />
  );
}
