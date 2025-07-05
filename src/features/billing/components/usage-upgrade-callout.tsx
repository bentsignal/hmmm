"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

export default function UsageUpgradeCallout() {
  const plan = useQuery(api.polar.getUserPlan, {});
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
