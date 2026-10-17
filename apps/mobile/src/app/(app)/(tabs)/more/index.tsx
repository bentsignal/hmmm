import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import PersonAdd from "@expo/material-symbols/person_add.xml";
import { FieldGroup } from "@expo/ui";

import { FieldList } from "~/components/field-list";
import { NativeHost } from "~/components/native-host";
import { NavigationRow } from "~/components/navigation-row";
import { AccountsSection } from "~/features/settings/accounts-section";
import { SignOutSection } from "~/features/settings/sign-out-section";

/**
 * The More tab: your accounts at the top, then settings, notifications,
 * and about, each on its own screen, with room for more (contacts) as the
 * app grows, and signing out at the bottom. The accounts lead the page,
 * so it has no title; adding one is the button in the corner.
 */
export default function MoreScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitleEnabled: false,
          headerTitle: "",
          title: "More",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={Platform.OS === "ios" ? "person.badge.plus" : PersonAdd}
          accessibilityLabel="Add Account"
          onPress={() => router.push("/add-account")}
        />
      </Stack.Toolbar>
      <NativeHost style={{ flex: 1 }}>
        <FieldList>
          <AccountsSection />
          <FieldGroup.Section>
            <NavigationRow
              icon={{ android: "settings", ios: "gearshape.fill" }}
              label="Settings"
              onPress={() => router.push("/more/settings")}
            />
            <NavigationRow
              icon={{ android: "notifications", ios: "bell.badge.fill" }}
              label="Notifications"
              onPress={() => router.push("/more/notifications")}
            />
          </FieldGroup.Section>
          <FieldGroup.Section>
            <NavigationRow
              icon={{ android: "info", ios: "info.circle.fill" }}
              label="About"
              onPress={() => router.push("/more/about")}
            />
          </FieldGroup.Section>
          <SignOutSection />
        </FieldList>
      </NativeHost>
    </>
  );
}
