import { Alert } from "react-native";
import { Button, FieldGroup } from "@expo/ui";

import { useAccounts } from "~/features/messaging/account";
import { useSession } from "~/features/session/session-provider";
import { destructive } from "~/lib/ui-modifiers";
import { signOutEverywhere } from "./sign-out";

/** Signs out of every account on this device, back to the welcome screen. */
export function SignOutSection() {
  const accounts = useAccounts();
  const { unreachable } = useSession();
  const [only] = accounts;
  const single =
    only !== undefined && accounts.length + unreachable.length === 1;
  const label = single ? "Sign Out" : "Sign Out of All Accounts";

  function confirm() {
    Alert.alert(
      single ? `Sign Out of ${only.address}?` : "Sign Out of All Accounts?",
      single
        ? "You can sign back in with your passkey."
        : "You can sign back in with your passkeys.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => signOutEverywhere(accounts, unreachable),
          style: "destructive",
          text: "Sign Out",
        },
      ],
    );
  }

  return (
    <FieldGroup.Section>
      <Button
        label={label}
        variant="text"
        modifiers={destructive}
        onPress={confirm}
      />
    </FieldGroup.Section>
  );
}
