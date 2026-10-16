import type { Space } from "@decentralized-convex/messages";
import { FieldGroup, Text } from "@expo/ui";

import { OptimisticChoice } from "~/components/optimistic-choice";
import { ALERT_CHOICES, spaceAlerts } from "~/features/messaging/alerts";
import { useChannelSettings } from "~/features/messaging/channel-settings";

/** What every channel in the space alerts you about. */
export function AlertsSection({ space }: { space: Space }) {
  const { setSpaceAlerts } = useChannelSettings();
  return (
    <FieldGroup.Section title="Notifications">
      <OptimisticChoice
        label="Notify Me About"
        value={spaceAlerts(space)}
        choices={ALERT_CHOICES}
        onChange={(alerts) =>
          setSpaceAlerts.mutateAsync({ alerts, spaceId: space.spaceId })
        }
      />
      <FieldGroup.SectionFooter>
        <Text>
          What every channel in this space shows in Activity and notifies you
          about. To choose for one channel, touch and hold it.
        </Text>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}
