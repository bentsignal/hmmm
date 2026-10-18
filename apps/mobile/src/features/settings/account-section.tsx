import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { FieldGroup } from "@expo/ui";

import { DestructiveButton } from "~/components/destructive-button";
import { useAccount } from "~/features/messaging/account";
import { signOutAccount } from "./sign-out";

/** Signs this account out, at the bottom of its screen. */
export function AccountSection() {
  const router = useRouter();
  const { address, session } = useAccount();

  function confirmSignOut() {
    Alert.alert(`Sign Out of ${address}?`, undefined, [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => {
          signOutAccount(session);
          router.back();
        },
        style: "destructive",
        text: "Sign Out",
      },
    ]);
  }

  return (
    <FieldGroup.Section>
      <DestructiveButton label="Sign Out" onPress={confirmSignOut} />
    </FieldGroup.Section>
  );
}
