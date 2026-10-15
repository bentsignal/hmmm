import { useRef, useState } from "react";
import { Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FieldGroup } from "@expo/ui";

import { NativeHost } from "~/components/native-host";
import { TextInput } from "~/components/text-input";
import { sheetIcons } from "~/features/compose/sheet";
import { AccountScope, useAccount } from "~/features/messaging/account";
import { useChannelSettings } from "~/features/messaging/channel-settings";
import { newId } from "~/features/messaging/optimistic";
import { useSpaceActions } from "~/features/messaging/spaces";

/**
 * Names a new channel, or renames one (`renaming`, with its current name).
 * Either way the sheet closes as it saves, and the name shows right away.
 */
function NewChannel({
  renaming,
  spaceId,
}: {
  renaming?: { conversationId: string; name: string };
  spaceId: string;
}) {
  const router = useRouter();
  const { address: self } = useAccount();
  const { createChannel } = useSpaceActions();
  const { renameChannel } = useChannelSettings();
  const [name, setName] = useState(renaming?.name ?? "");
  // The sheet closes as it creates; a second tap must not make another.
  const created = useRef(false);

  function create() {
    if (created.current) return;
    created.current = true;
    if (renaming !== undefined) {
      void renameChannel
        .mutateAsync({
          conversationId: renaming.conversationId,
          name: name.trim(),
        })
        .catch(() =>
          Alert.alert("Couldn't Rename Channel", "Try again in a moment."),
        );
      router.dismiss();
      return;
    }
    const args = {
      conversationId: newId("channel", self),
      name: name.trim(),
      spaceId,
    };
    void createChannel
      .mutateAsync(args)
      .catch(() =>
        Alert.alert("Couldn't Create Channel", "Try again in a moment."),
      );
    router.dismiss();
  }

  return (
    <>
      {renaming !== undefined && <Stack.Title>Rename Channel</Stack.Title>}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={sheetIcons.done}
          accessibilityLabel={
            renaming === undefined ? "Create Channel" : "Save Name"
          }
          variant="prominent"
          disabled={name.trim().length === 0}
          onPress={create}
        />
      </Stack.Toolbar>
      <NativeHost style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="Channel Name">
            <TextInput
              autoFocus
              autoCapitalize="none"
              defaultValue={renaming?.name}
              placeholder="new-channel"
              onChangeText={setName}
            />
          </FieldGroup.Section>
        </FieldGroup>
      </NativeHost>
    </>
  );
}

export default function NewChannelScreen() {
  const { account, conversationId, name, spaceId } = useLocalSearchParams<{
    account?: string;
    /** The channel to rename, with its `name`; absent for a new one. */
    conversationId?: string;
    name?: string;
    spaceId: string;
  }>();
  return (
    <AccountScope address={account}>
      <NewChannel
        renaming={
          conversationId === undefined
            ? undefined
            : { conversationId, name: name ?? "" }
        }
        spaceId={spaceId}
      />
    </AccountScope>
  );
}
