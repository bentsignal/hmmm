import { useSuspenseQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@acme/ui/card";

import UsageCountdown from "~/features/billing/components/usage-countdown";
import UsageProgress from "~/features/billing/components/usage-progress";
import UsageUpgradeCallout from "~/features/billing/components/usage-upgrade-callout";
import { userQueries } from "~/lib/queries";

export default function Usage() {
  const { data: usage } = useSuspenseQuery(userQueries.usage());

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
