"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function UsageUpgradeCallout() {
  const { isAuthenticated } = useConvexAuth();
  const plan = useQuery(
    api.user.subscription.getUserPlan,
    isAuthenticated ? {} : "skip",
  );
  if (plan?.max) return null;
  return (
    <span className="text-muted-foreground text-sm">
      <Link href="/pricing" className="text-primary font-bold underline">
        Upgrade
      </Link>{" "}
      to increase your limits.
    </span>
  );
}
