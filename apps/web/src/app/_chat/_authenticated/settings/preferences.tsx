import { createFileRoute } from "@tanstack/react-router";

import { userQueries } from "@acme/features/lib/queries";

import { SettingsWrapper } from "~/app/settings/-wrapper";
import { Appearance } from "~/app/settings/preferences/-appearance";
import { Bangs } from "~/app/settings/preferences/-bangs";
import { Notifications } from "~/app/settings/preferences/-notifications";
import { Personalization } from "~/app/settings/preferences/-personalization";
import { Shortcuts } from "~/features/shortcuts/components/shortcuts";

export const Route = createFileRoute(
  "/_chat/_authenticated/settings/preferences",
)({
  component: PreferencesPage,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(userQueries.info()),
      context.queryClient.ensureQueryData(userQueries.newsletterPreference()),
      context.queryClient.ensureQueryData(userQueries.showModelSelector()),
    ]);
  },
});

function PreferencesPage() {
  return (
    <SettingsWrapper>
      <Appearance />
      <Personalization />
      <Notifications />
      <Shortcuts />
      <Bangs />
    </SettingsWrapper>
  );
}
