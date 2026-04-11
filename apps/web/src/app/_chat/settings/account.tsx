import { createFileRoute } from "@tanstack/react-router";

import SettingsWrapper from "~/app/settings/-wrapper";
import AccountInfo from "~/app/settings/account/-account-info";
import Billing from "~/app/settings/account/-billing";
import DeleteAccount from "~/app/settings/account/-delete";
import Usage from "~/app/settings/account/-usage";

export const Route = createFileRoute("/_chat/settings/account")({
  component: AccountPage,
});

function AccountPage() {
  return (
    <SettingsWrapper>
      <Usage />
      <Billing />
      <AccountInfo />
      <DeleteAccount />
    </SettingsWrapper>
  );
}
