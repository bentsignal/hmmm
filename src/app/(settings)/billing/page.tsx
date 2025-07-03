import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import UserBillingInfo from "@/features/billing/components/user-billing-info";

export default async function Billing() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col justify-center gap-4">
        <span className="text-xl font-bold">Billing</span>
        <UserBillingInfo />
      </CardContent>
    </Card>
  );
}
