import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import Add from "@expo/material-symbols/add.xml";

import { FieldList } from "~/components/field-list";
import { NativeHost } from "~/components/native-host";
import { AccountsSection } from "~/features/settings/accounts-section";

/** Every signed-in account, with a plus in the header to add one. */
export default function AccountsScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerLargeTitleEnabled: false }} />
      <Stack.Title>Accounts</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={Platform.OS === "ios" ? "plus" : Add}
          accessibilityLabel="Add Account"
          onPress={() => router.push("/add-account")}
        />
      </Stack.Toolbar>
      <NativeHost style={{ flex: 1 }}>
        <FieldList>
          <AccountsSection />
        </FieldList>
      </NativeHost>
    </>
  );
}
