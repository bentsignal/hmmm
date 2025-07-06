"use client";

import { Progress } from "@/components/ui/progress";
import useUsage from "../hooks/use-usage";

export default function UsageProgress({
  initialRange,
  initialPercentageUsed,
}: {
  initialRange: string;
  initialPercentageUsed: number;
}) {
  const { usage } = useUsage();
  const percentageUsed = usage?.percentageUsed ?? initialPercentageUsed;
  const range = usage?.range ?? initialRange;
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <h3 className="text-muted-foreground ">
        You have used{" "}
        <span className="text-foreground font-bold">
          {percentageUsed.toFixed(2)}%
        </span>{" "}
        of your {range} limit
      </h3>
      <Progress value={percentageUsed} className="w-full max-w-[300px]" />
    </div>
  );
}
