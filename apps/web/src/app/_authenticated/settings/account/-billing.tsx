import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";

import { api } from "@acme/db/api";
import { billingQueries } from "@acme/features/billing";
import { Button } from "@acme/ui/button";

import { InfoCard } from "~/components/info-card";
import { QuickLink as Link } from "~/features/quick-link/quick-link";

function useBilling() {
  const { data: allPlans } = useSuspenseQuery({
    ...billingQueries.listAllProducts(),
    select: (data) =>
      data.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        prices: plan.prices,
        isArchived: plan.isArchived,
      })),
  });
  const { data: usersPlan } = useSuspenseQuery({
    ...billingQueries.currentPlan(),
    select: (data) => data,
  });

  const plans = allPlans
    .filter((plan) => plan.isArchived === false)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.prices[0]?.priceAmount ?? 0,
    }));

  return { plans, usersPlan };
}

export function Billing() {
  const { plans, usersPlan } = useBilling();

  return (
    <InfoCard title="Billing">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1">
          <span className="text-foreground font-bold">Current plan:</span>
          <span>{usersPlan.name}</span>
        </div>
        <div className="flex gap-2">
          <Link to="/pricing">
            <Button variant="outline">View plans</Button>
          </Link>
          {usersPlan.name === "Free" ? (
            <CheckoutLink
              polarApi={{
                generateCheckoutLink: api.polar.generateCheckoutLink,
              }}
              productIds={plans.map((product) => product.id)}
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
              <Button>Manage subscription</Button>
            </CustomerPortalLink>
          )}
        </div>
      </div>
    </InfoCard>
  );
}
