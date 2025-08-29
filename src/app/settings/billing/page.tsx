import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/features/auth/util";
import UserBillingInfo from "@/features/billing/components/user-billing-info";
import SettingsCard from "@/features/settings/components/settings-card";

export default async function Billing() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

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
    <SettingsCard title="Billing">
      <UserBillingInfo plans={publicPlans} usersPlan={usersPlan} />
    </SettingsCard>
  );
}
