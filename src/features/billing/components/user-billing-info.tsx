"use client";

import { api } from "@/convex/_generated/api";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SettingsLoading from "@/features/settings/components/settings-loading";
import useCurrentPlan from "@/features/billing/hooks/use-current-plan";

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
      <span className="font-bold">
        Current plan:{" "}
        <span className="text-muted-foreground font-normal">
          {plan !== null && plan !== undefined ? plan.name : "Light"}
        </span>
      </span>
      <div className="flex gap-2">
        <Link href="/pricing">
          <Button variant="outline">View plans</Button>
        </Link>
        {!plan ? (
          <CheckoutLink
            polarApi={{
              generateCheckoutLink: api.polar.generateCheckoutLink,
            }}
            productIds={plans?.map((product) => product.id) ?? []}
            embed={false}
          >
            <Button>Upgrade</Button>
          </CheckoutLink>
        ) : (
          <CustomerPortalLink
            polarApi={{
              generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
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
