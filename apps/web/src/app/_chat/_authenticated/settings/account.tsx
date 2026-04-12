import { createFileRoute } from "@tanstack/react-router";

import SettingsWrapper from "~/app/settings/-wrapper";
import AccountInfo from "~/app/settings/account/-account-info";
import { Billing } from "~/app/settings/account/-billing";
import DeleteAccount from "~/app/settings/account/-delete";
import Usage from "~/app/settings/account/-usage";
import { pricingQueries, userQueries } from "~/lib/queries";

export const Route = createFileRoute("/_chat/_authenticated/settings/account")({
  component: AccountPage,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(userQueries.usage()),
      context.queryClient.ensureQueryData(userQueries.plan()),
      context.queryClient.ensureQueryData(userQueries.email()),
      context.queryClient.ensureQueryData(pricingQueries.listAllProducts()),
    ]);
  },
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
