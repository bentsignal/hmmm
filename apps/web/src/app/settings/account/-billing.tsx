import { useQuery } from "convex/react";

import { api } from "@acme/db/api";

import InfoCard from "~/components/info-card";
import UserBillingInfo from "~/features/billing/components/user-billing-info";

export default function Billing() {
  const plans = useQuery(api.polar.listAllProducts);
  const usersPlan = useQuery(api.user.subscription.getPlan);

  if (plans === undefined || usersPlan === undefined) {
    return null;
  }

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
