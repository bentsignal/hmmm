import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PageFallback } from "@/components/error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util";
import UsageCountdown from "@/features/billing/components/usage-countdown";
import UsageProgress from "@/features/billing/components/usage-progress";
import UsageUpgradeCallout from "@/features/billing/components/usage-upgrade-callout";

export default async function Usage() {
  const token = await getAuthToken();

  // get initial usage data
  const { data: usage, error } = await tryCatch(
    fetchQuery(api.user.usage.getUsage, undefined, { token }),
  );

  // get user's plan
  if (error || usage === null) {
    console.error(error);
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
