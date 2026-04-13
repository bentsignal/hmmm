import { useUsage } from "@acme/features/billing";
import { useCountdown } from "@acme/features/hooks";
import { formatCountdownString } from "@acme/features/lib/date-time-utils";

export function UsageCountdown({ initialTarget }: { initialTarget: Date }) {
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
