import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import { api } from "@acme/db/api";

import PricingCards from "~/features/billing/components/pricing-cards";

export const Route = createFileRoute("/_chat/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const plans = useQuery(api.polar.listAllProducts);

  if (plans === undefined) {
    return null;
  }

  const publicPlans = plans
    .filter((plan) => plan.isArchived === false)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.prices[0]?.priceAmount ?? 0,
      period: plan.recurringInterval,
    }))
    .sort((a, b) => a.price - b.price);

  return <PricingCards products={publicPlans} />;
}
