import SettingsWrapper from "@/app/settings/wrapper";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Appearance from "./appearance";
import Bangs from "./bangs";
import Experimental from "./experimental";
import Notifications from "./notifications";
import Personalization from "./personalization";
import Shortcuts from "@/features/shortcuts/components";

export default async function Preferences() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return (
    <SettingsWrapper>
      <Appearance />
      <Personalization />
      <Notifications />
      <Shortcuts />
      <Bangs />
      <Experimental />
    </SettingsWrapper>
  );
}
