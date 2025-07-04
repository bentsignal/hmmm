"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
