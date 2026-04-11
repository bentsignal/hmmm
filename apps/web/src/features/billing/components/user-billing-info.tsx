import { Link } from "@tanstack/react-router";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";

import type { Plan } from "@acme/db/subscription";
import { api } from "@acme/db/api";
import { Button } from "@acme/ui/button";

export default function UserBillingInfo({
  plans,
  usersPlan,
}: {
  plans: { id: string; name: string; price: number }[];
  usersPlan: Plan;
}) {
  return (
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
            <Button>Manage subscription</Button>
          </CustomerPortalLink>
        )}
      </div>
    </div>
  );
}
