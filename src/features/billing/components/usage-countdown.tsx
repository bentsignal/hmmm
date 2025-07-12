"use client";

import { formatCountdownString } from "@/lib/date-time-utils";
import useCountdown from "@/hooks/use-countdown";
import useUsage from "@/features/billing/hooks/use-usage";

export default function UsageCountdown({
  initialTarget,
}: {
  initialTarget: Date;
}) {
  const { usage } = useUsage();
  const { minutes, hours, days } = useCountdown({
    target: new Date(usage?.endOfPeriod ?? initialTarget),
    updateInterval: 1,
  });
  const timeRemaining = formatCountdownString(days, hours, minutes);
  return (
    <span className="text-sm">
      Your limit will reset in{" "}
      <span className="font-bold whitespace-nowrap">{timeRemaining}</span>
    </span>
  );
}
