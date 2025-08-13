"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const LibraryStorageStatus = ({
  storageUsed,
  storageLimit,
  percentageUsed,
}: {
  storageUsed: number;
  storageLimit: number;
  percentageUsed: number;
}) => {
  const usedGB = (storageUsed / 1024 / 1024 / 1024).toFixed(2);
  const limitGB = (storageLimit / 1024 / 1024 / 1024).toFixed(0);

  const textColor =
    percentageUsed >= 90
      ? "text-destructive"
      : percentageUsed >= 75
        ? "text-yellow-500"
        : "text-muted-foreground";

  if (storageLimit === 0) {
    return (
      <div className="m-4 flex flex-col gap-4">
        <Link
          href="/pricing"
          className="text-primary text-sm font-bold text-wrap underline"
        >
          Upgrade to premium to access file storage.
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {percentageUsed > 75 ||
        (Number.isNaN(percentageUsed) && (
          <Link
            href="/pricing"
            className="text-primary text-sm font-bold underline"
          >
            Upgrade
          </Link>
        ))}
      <span className={cn("text-muted-foreground text-sm", textColor)}>
        <span className="font-bold">{usedGB} GB</span> of{" "}
        <span className="font-bold">{limitGB} GB</span> used
      </span>
      <Progress value={percentageUsed} className="h-2" />
    </div>
  );
};
