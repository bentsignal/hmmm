import { useQuery } from "convex/react";

import { api } from "@acme/db/api";
import { Card, CardContent } from "@acme/ui/card";

import { PageFallback } from "~/components/error-boundary";
import UsageCountdown from "~/features/billing/components/usage-countdown";
import UsageProgress from "~/features/billing/components/usage-progress";
import UsageUpgradeCallout from "~/features/billing/components/usage-upgrade-callout";

export default function Usage() {
  const usage = useQuery(api.user.usage.getUsage);

  if (usage === undefined) {
    return null;
  }

  if (usage === null) {
    return <PageFallback />;
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Usage</h1>
        {usage.unlimited ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-sm">
              You have unlimited usage.
            </p>
          </div>
        ) : (
          <>
            <UsageProgress
              initialRange={usage.range}
              initialPercentageUsed={usage.percentageUsed}
            />
            <div className="flex flex-col items-center gap-2">
              <UsageCountdown initialTarget={new Date(usage.endOfPeriod)} />
              <UsageUpgradeCallout />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
