import { createFileRoute } from "@tanstack/react-router";

import { pricingQueries, userQueries } from "@acme/features/lib/queries";

import { SettingsWrapper } from "./-wrapper";
import { AccountInfo } from "./account/-account-info";
import { Billing } from "./account/-billing";
import { DeleteAccount } from "./account/-delete";
import { Usage } from "./account/-usage";

export const Route = createFileRoute("/_authenticated/settings/account")({
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
