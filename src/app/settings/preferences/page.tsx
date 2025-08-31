import SettingsWrapper from "@/app/settings/wrapper";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Bangs from "./bangs";
import Notifications from "./notifications";
import PersonalInfo from "./personal-info";
// import Theme from "./theme";
import Shortcuts from "@/features/shortcuts/components";

export default async function Preferences() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return (
    <SettingsWrapper>
      {/* <Theme /> */}
      <PersonalInfo />
      <Notifications />
      <Shortcuts />
      <Bangs />
    </SettingsWrapper>
  );
}
