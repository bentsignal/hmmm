import { useQuery } from "convex/react";

import { api } from "@acme/db/api";

import { QuickLink as Link } from "~/features/quick-link/quick-link";

export function UsageUpgradeCallout() {
  // eslint-disable-next-line no-restricted-syntax -- Convex useQuery does not support `select`; data is already minimal (name, price, max)
  const plan = useQuery(api.user.subscription.getPlan, {});
  if (plan?.max) return null;
  return (
    <span className="text-muted-foreground text-sm">
      <Link to="/pricing" className="text-primary font-bold underline">
        Upgrade
      </Link>{" "}
      to increase your limits.
    </span>
  );
}
