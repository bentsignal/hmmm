import { createFileRoute } from "@tanstack/react-router";

import SettingsWrapper from "~/app/settings/-wrapper";
import Appearance from "~/app/settings/preferences/-appearance";
import Bangs from "~/app/settings/preferences/-bangs";
import Experimental from "~/app/settings/preferences/-experimental";
import Notifications from "~/app/settings/preferences/-notifications";
import Personalization from "~/app/settings/preferences/-personalization";
import Shortcuts from "~/features/shortcuts/components";

export const Route = createFileRoute("/_chat/settings/preferences")({
  component: PreferencesPage,
});

function PreferencesPage() {
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
