"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { Button } from "@/components/ui/button";
import SettingsLoading from "@/features/settings/components/settings-loading";
// import Link from "next/link";

export default function UserBillingInfo() {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const currentUser = useQuery(api.polar.getCurrentUser, args);
  const products = useQuery(api.polar.listAllProducts, args);
  if (!currentUser || !products) {
    return <SettingsLoading />;
  }
  return (
    <div className="flex flex-col gap-4">
      <span className="font-bold">
        Current plan:{" "}
        <span className="text-muted-foreground font-normal">
          {currentUser?.isFree ? "Free" : "Premium"}
        </span>
      </span>
      {currentUser?.isFree ? (
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
      {/* <Link href="/plans" className="text-muted-foreground text-sm">
        View plans
      </Link> */}
    </div>
  );
}
