import { useSuspenseQuery } from "@tanstack/react-query";

import InfoCard from "~/components/info-card";
import UserBillingInfo from "~/features/billing/components/user-billing-info";
import { pricingQueries, userQueries } from "~/lib/queries";

export default function Billing() {
  const { data: plans } = useSuspenseQuery(pricingQueries.listAllProducts());
  const { data: usersPlan } = useSuspenseQuery(userQueries.plan());

  const publicPlans = plans
    .filter((plan) => plan.isArchived === false)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.prices[0]?.priceAmount ?? 0,
    }));

  return (
    <InfoCard title="Billing">
      <UserBillingInfo plans={publicPlans} usersPlan={usersPlan} />
    </InfoCard>
  );
}
