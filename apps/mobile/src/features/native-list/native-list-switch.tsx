import { FieldGroup, Switch } from "@expo/ui";

import { env } from "~/env";
import { useAccounts } from "~/features/messaging/account";
import { NATIVE_LIST, setNativeList, useNativeListOn } from "./switch";

/** Turns the native message list on or off on this device. */
export function NativeListSwitch() {
  return (
    <Switch
      label="Native Message List"
      value={useNativeListOn()}
      onValueChange={setNativeList}
    />
  );
}

/**
 * The switch in production builds, for its testers (`NATIVE_LIST.testers`)
 * when one of them is signed in. Dev builds have it in the Developer
 * section.
 */
export function NativeListTesting() {
  const accounts = useAccounts();
  const tester = accounts.some((account) =>
    NATIVE_LIST.testers.has(account.address),
  );
  if (env.devTools || !tester) return null;
  return (
    <FieldGroup.Section title="Testing">
      <NativeListSwitch />
    </FieldGroup.Section>
  );
}
