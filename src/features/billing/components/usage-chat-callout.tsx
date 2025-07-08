"use client";

import useUsage from "../hooks/use-usage";
import UsageCountdown from "./usage-countdown";
import UsageUpgradeCallout from "./usage-upgrade-callout";

export default function UsageChatCallout() {
  const { usage } = useUsage();

  if (!usage) return null;
  if (!usage.limitHit) return null;

  return (
    <div className="mb-4 flex flex-col items-center gap-2 text-center">
      <span className="text-lg font-bold text-red-400">
        You&apos;ve reached your usage limit.
      </span>
      <UsageCountdown initialTarget={new Date(usage.endOfPeriod)} />
      <UsageUpgradeCallout />
    </div>
  );
}
