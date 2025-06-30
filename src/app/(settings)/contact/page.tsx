import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function Contact() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <Card className="w-full">
      <CardContent className="flex justify-center">
        <span className="text-xl font-bold">Contact</span>
      </CardContent>
    </Card>
  );
}
