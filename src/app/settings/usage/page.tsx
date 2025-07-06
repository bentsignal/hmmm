import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthToken } from "@/features/auth/util/auth-util";
import { tryCatch } from "@/lib/utils";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PageFallback } from "@/components/error-boundary";
import UsageCountdown from "@/features/billing/components/usage-countdown";
import UsageProgress from "@/features/billing/components/usage-progress";
import UsageUpgradeCallout from "@/features/billing/components/usage-upgrade-callout";

export default async function Usage() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  const token = await getAuthToken();

  // get initial usage data
  const { data: usage, error } = await tryCatch(
    fetchQuery(api.usage.getUsage, undefined, { token }),
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
        <UsageProgress
          initialRange={usage.range}
          initialPercentageUsed={usage.percentageUsed}
        />
        <div className="flex flex-col items-center gap-2">
          <UsageCountdown initialTarget={new Date(usage.endOfPeriod)} />
          <UsageUpgradeCallout />
        </div>
      </CardContent>
    </Card>
  );
}
