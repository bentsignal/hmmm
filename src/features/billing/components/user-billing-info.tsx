"use client";

import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import useCurrentPlan from "@/features/billing/hooks/use-current-plan";
import SettingsLoading from "@/features/settings/components/settings-loading";

export default function UserBillingInfo({
  plans,
}: {
  plans: { id: string; name: string; price: number }[];
}) {
  const { plan, planLoading, planError } = useCurrentPlan();

  if (planLoading) {
    return <SettingsLoading />;
  }

  if (planError) {
    return (
      <span className="text-destructive">
        Failed to load billing info. Please try again later.
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        <span className="font-bold text-foreground">Current plan:</span>
        <span>{plan !== null && plan !== undefined ? plan.name : "Light"}</span>
      </div>
      <div className="flex gap-2">
        <Link href="/pricing">
          <Button variant="outline">View plans</Button>
        </Link>
        {!plan ? (
          <CheckoutLink
            polarApi={{
              generateCheckoutLink: api.sub.sub_actions.generateCheckoutLink,
            }}
            productIds={plans?.map((product) => product.id) ?? []}
            embed={false}
          >
            <Button>Upgrade</Button>
          </CheckoutLink>
        ) : (
          <CustomerPortalLink
            polarApi={{
              generateCustomerPortalUrl:
                api.sub.sub_actions.generateCustomerPortalUrl,
            }}
          >
            <Button className="animate-in fade-in duration-300">
              Manage subscription
            </Button>
          </CustomerPortalLink>
        )}
      </div>
    </div>
  );
}
