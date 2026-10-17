import { Stack, useRouter } from "expo-router";
import { FieldGroup } from "@expo/ui";

import { FieldList } from "~/components/field-list";
import { NativeHost } from "~/components/native-host";
import { NavigationRow } from "~/components/navigation-row";

/**
 * The You tab: settings, notifications, accounts, and about, each on its
 * own screen, with room for more (contacts) as the app grows. The tab bar
 * already names it, so it has no title.
 */
export default function YouScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "You" }} />
      <NativeHost style={{ flex: 1 }}>
        <FieldList clearsStatusBar>
          <FieldGroup.Section>
            <NavigationRow
              icon={{ android: "settings", ios: "gearshape.fill" }}
              label="Settings"
              onPress={() => router.push("/you/settings")}
            />
            <NavigationRow
              icon={{ android: "notifications", ios: "bell.badge.fill" }}
              label="Notifications"
              onPress={() => router.push("/you/notifications")}
            />
            <NavigationRow
              icon={{
                android: "account_circle",
                ios: "person.crop.circle.fill",
              }}
              label="Accounts"
              onPress={() => router.push("/you/accounts")}
            />
          </FieldGroup.Section>
          <FieldGroup.Section>
            <NavigationRow
              icon={{ android: "info", ios: "info.circle.fill" }}
              label="About"
              onPress={() => router.push("/you/about")}
            />
          </FieldGroup.Section>
        </FieldList>
      </NativeHost>
    </>
  );
}
