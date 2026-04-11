import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@acme/db/api";

export default function UsageUpgradeCallout() {
  const { isAuthenticated } = useConvexAuth();
  const plan = useQuery(
    api.user.subscription.getPlan,
    isAuthenticated ? {} : "skip",
  );
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
