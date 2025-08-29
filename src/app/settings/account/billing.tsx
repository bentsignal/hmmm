import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import InfoCard from "@/components/info-card";
import { getAuthToken } from "@/features/auth/util";
import UserBillingInfo from "@/features/billing/components/user-billing-info";

export default async function Billing() {
  // strip plan data for client side
  const plans = await fetchQuery(api.polar.listAllProducts, {});
  const publicPlans = plans
    .filter((plan) => plan.isArchived === false)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.prices[0].priceAmount ?? 0,
    }));

  // get user's current plan
  const authToken = await getAuthToken();
  const usersPlan = await fetchQuery(
    api.user.subscription.getPlan,
    {},
    { token: authToken },
  );

  return (
    <InfoCard title="Billing">
      <UserBillingInfo plans={publicPlans} usersPlan={usersPlan} />
    </InfoCard>
  );
}
