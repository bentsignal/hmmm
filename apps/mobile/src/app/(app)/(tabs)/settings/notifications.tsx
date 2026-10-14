import Animated, { FadeIn } from "react-native-reanimated";
import { Stack } from "expo-router";
import { FieldGroup, Text } from "@expo/ui";

import type { NotificationKind } from "~/features/settings/notification-settings";
import { FieldList } from "~/components/field-list";
import { NativeHost } from "~/components/native-host";
import { OptimisticSwitch } from "~/components/optimistic-switch";
import { useNotificationSettings } from "~/features/settings/notification-settings";

const KINDS = [
  { kind: "directMessages", label: "Direct Messages" },
  { kind: "groups", label: "Group Chats" },
  { kind: "channels", label: "Space Channels" },
  { kind: "reactions", label: "Reactions" },
  { kind: "invites", label: "Space Invites" },
] as const satisfies readonly { kind: NotificationKind; label: string }[];

/** Which kinds of notifications you get, or none at all. */
export default function NotificationSettingsScreen() {
  const { settings, set } = useNotificationSettings();
  return (
    <>
      <Stack.Screen options={{ headerLargeTitleEnabled: false }} />
      <Stack.Title>Notifications</Stack.Title>
      {settings === null && (
        <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
          <NativeHost style={{ flex: 1 }}>
            <FieldList>
              <FieldGroup.Section>
                <FieldGroup.SectionFooter>
                  <Text>
                    Your account's server doesn't have notification settings
                    yet.
                  </Text>
                </FieldGroup.SectionFooter>
              </FieldGroup.Section>
            </FieldList>
          </NativeHost>
        </Animated.View>
      )}
      {settings != null && (
        <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
          <NativeHost style={{ flex: 1 }}>
            <FieldList>
              <FieldGroup.Section>
                <OptimisticSwitch
                  label="Allow Notifications"
                  value={settings.enabled}
                  onChange={(on) => set("enabled", on)}
                />
                <FieldGroup.SectionFooter>
                  <Text>
                    When this is off, Vera sends no notifications at all.
                    Activity still shows what you missed.
                  </Text>
                </FieldGroup.SectionFooter>
              </FieldGroup.Section>
              {settings.enabled && (
                <FieldGroup.Section title="Notify Me About">
                  {KINDS.map(({ kind, label }) => (
                    <OptimisticSwitch
                      key={kind}
                      label={label}
                      value={settings[kind]}
                      onChange={(on) => set(kind, on)}
                    />
                  ))}
                  <FieldGroup.SectionFooter>
                    <Text>
                      To quiet one person, group, or channel, touch and hold it
                      in your Inbox and choose Hide Alerts. To quiet a whole
                      space, turn on Hide Alerts in the space.
                    </Text>
                  </FieldGroup.SectionFooter>
                </FieldGroup.Section>
              )}
            </FieldList>
          </NativeHost>
        </Animated.View>
      )}
    </>
  );
}
