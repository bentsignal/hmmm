import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsWrapper from "../wrapper";
import Billing from "./billing";
import DeleteAccount from "./delete";
import AccountInfo from "./info";
import Usage from "./usage";

export default async function Account() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return (
    <SettingsWrapper>
      <Usage />
      <Billing />
      <AccountInfo />
      <DeleteAccount />
    </SettingsWrapper>
  );
}
