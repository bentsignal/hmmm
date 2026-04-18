import { useCurrentPlan } from "@acme/features/billing";

import { QuickLink as Link } from "~/features/quick-link/quick-link";

export function UsageUpgradeCallout() {
  const { myPlan } = useCurrentPlan();
  if (myPlan?.max) return null;
  return (
    <span className="text-muted-foreground text-sm">
      <Link to="/pricing" className="text-primary font-bold underline">
        Upgrade
      </Link>{" "}
      to increase your limits.
    </span>
  );
}
