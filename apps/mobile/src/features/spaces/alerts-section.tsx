import type { Space } from "@decentralized-convex/messages";
import { FieldGroup, Text } from "@expo/ui";

import { OptimisticSwitch } from "~/components/optimistic-switch";
import { useChannelSettings } from "~/features/messaging/channel-settings";

/** Hide Alerts for the whole space: every channel goes quiet. */
export function AlertsSection({ space }: { space: Space }) {
  const { setSpaceMuted } = useChannelSettings();
  return (
    <FieldGroup.Section title="Notifications">
      <OptimisticSwitch
        label="Hide Alerts"
        value={space.muted === true}
        onChange={(muted) =>
          setSpaceMuted.mutateAsync({ muted, spaceId: space.spaceId })
        }
      />
      <FieldGroup.SectionFooter>
        <Text>
          No notifications from any channel in this space. Its channels still
          show in your Inbox.
        </Text>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}
