import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function Billing() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <Card className="w-full">
      <CardContent className="flex justify-center">
        <span className="text-xl font-bold">Billing</span>
      </CardContent>
    </Card>
  );
}
