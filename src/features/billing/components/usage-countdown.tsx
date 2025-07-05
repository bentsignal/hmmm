"use client";

import useUsage from "@/features/billing/hooks/use-usage";
import useCountdown from "@/features/date-time/hooks/use-countdown";
import { formatCountdownString } from "@/features/date-time/util/date-time-util";

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
