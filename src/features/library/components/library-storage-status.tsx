"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const LibraryStorageStatus = () => {
  const isAuthenticated = useConvexAuth();
  const storageStatus = useQuery(
    api.library.library_queries.getStorageStatus,
    isAuthenticated ? {} : "skip",
  );

  if (!storageStatus) return null;

  const usedGB = (storageStatus.storageUsed / 1024 / 1024 / 1024).toFixed(2);
  const limitGB = (storageStatus.storageLimit / 1024 / 1024 / 1024).toFixed(0);

  const percentageUsed = Math.min(
    (storageStatus.storageUsed / storageStatus.storageLimit) * 100,
    100,
  );
  const textColor =
    percentageUsed >= 90
      ? "text-destructive"
      : percentageUsed >= 75
        ? "text-yellow-500"
        : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-2">
      {percentageUsed > 75 && (
        <Link
          href="/pricing"
          className="text-primary text-sm font-bold underline"
        >
          Upgrade
        </Link>
      )}
      <span className={cn("text-muted-foreground text-sm", textColor)}>
        <span className="font-bold">{usedGB} GB</span> of{" "}
        <span className="font-bold">{limitGB} GB</span> used
      </span>
      <Progress value={percentageUsed} className="h-2" />
    </div>
  );
};
