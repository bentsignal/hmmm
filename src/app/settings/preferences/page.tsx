import SettingsWrapper from "@/app/settings/wrapper";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Bangs from "./bangs";
import Notifications from "./notifications";
import Shortcuts from "@/features/shortcuts/components";

export default async function Preferences() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return (
    <SettingsWrapper>
      <Notifications />
      <Shortcuts />
      <Bangs />
    </SettingsWrapper>
  );
}
