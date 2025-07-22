import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import UserBillingInfo from "@/features/billing/components/user-billing-info";
import SettingsCard from "@/features/settings/components/settings-card";

export default async function Billing() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  // strip plan data for client side
  const plans = await fetchQuery(api.sub.sub_queries.listAllProducts, {});
  const publicPlans = plans
    .filter((plan) => plan.isArchived === false)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.prices[0].priceAmount ?? 0,
    }));

  return (
    <SettingsCard title="Billing">
      <UserBillingInfo plans={publicPlans} />
    </SettingsCard>
  );
}
