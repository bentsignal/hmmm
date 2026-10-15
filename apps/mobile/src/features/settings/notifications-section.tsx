import { useRouter } from "expo-router";
import { FieldGroup, Text } from "@expo/ui";

import { ListItem } from "~/components/list-item";
import { SymbolIcon } from "~/components/symbol-icon";

/** The row that opens notification settings. */
export function NotificationsSection() {
  const router = useRouter();
  return (
    <FieldGroup.Section>
      <ListItem
        leading={
          <SymbolIcon
            name={{ android: "notifications", ios: "bell.badge.fill" }}
            size={20}
            tintColorClassName="accent-accent"
          />
        }
        trailing={
          <SymbolIcon
            name={{ android: "chevron_right", ios: "chevron.right" }}
            size={14}
            weight="semibold"
            tintColorClassName="accent-subtle"
          />
        }
        onPress={() => router.push("/settings/notifications")}
      >
        <Text>Notifications</Text>
      </ListItem>
    </FieldGroup.Section>
  );
}
