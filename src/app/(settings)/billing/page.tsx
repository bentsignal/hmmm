import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import UserBillingInfo from "@/features/billing/components/user-billing-info";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

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

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col justify-center gap-4">
        <span className="text-xl font-bold">Billing</span>
        <UserBillingInfo plans={publicPlans} />
      </CardContent>
    </Card>
  );
}
