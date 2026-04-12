import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import PricingCards from "~/features/billing/components/pricing-cards";
import { pricingQueries } from "~/lib/queries";

export const Route = createFileRoute("/_chat/pricing")({
  component: PricingPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(pricingQueries.listAllProducts());
  },
});

function PricingPage() {
  const { data: plans } = useSuspenseQuery({
    ...pricingQueries.listAllProducts(),
    select: (data) =>
      data.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        prices: plan.prices,
        recurringInterval: plan.recurringInterval,
        isArchived: plan.isArchived,
      })),
  });

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
