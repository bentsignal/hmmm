"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { Button } from "@/components/ui/button";
import SettingsLoading from "@/features/settings/components/settings-loading";

export default function UserBillingInfo() {
  // get user info
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    data: plan,
    isPending: userLoading,
    error: userError,
  } = useQuery(convexQuery(api.polar.getUserPlan, args));

  // get product offerings
  const {
    data: products,
    isPending: productsLoading,
    error: productsError,
  } = useQuery(convexQuery(api.polar.listAllProducts, args));

  if (userError || productsError) {
    console.error(userError, productsError);
    return (
      <span className="text-destructive">
        Failed to load billing info. Please try again later.
      </span>
    );
  }

  if (userLoading || productsLoading) {
    return <SettingsLoading />;
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="font-bold">
        Current plan:{" "}
        <span className="text-muted-foreground font-normal">{plan}</span>
      </span>
      {plan === "Free" ? (
        <CheckoutLink
          polarApi={{
            generateCheckoutLink: api.polar.generateCheckoutLink,
          }}
          productIds={products?.map((product) => product.id) ?? []}
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
  );
}
