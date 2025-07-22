import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsBangs from "@/features/settings/components/settings-bangs";
import SettingsCard from "@/features/settings/components/settings-card";
import Shortcuts from "@/features/shortcuts/components";

export default async function Settings() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <div className="flex flex-col gap-4">
      <SettingsCard title="Search">
        <SettingsBangs />
      </SettingsCard>
      <SettingsCard title="Shortcuts">
        <Shortcuts />
      </SettingsCard>
    </div>
  );
}
