import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import SettingsBangs from "@/features/settings/components/settings-bangs";

export default async function Settings() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4">
        <span className="text-xl font-bold">General</span>
        <SettingsBangs />
      </CardContent>
    </Card>
  );
}
