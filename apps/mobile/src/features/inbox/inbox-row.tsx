import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Box,
  DropdownMenu,
  DropdownMenuItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { fillMaxSize } from "@expo/ui/jetpack-compose/modifiers";
import { useCSSVariable } from "uniwind";

import type { ConversationSummary } from "./types";
import { NativeHost } from "~/components/native-host";
import { useRunAs } from "~/features/messaging/account";
import { impact } from "~/lib/native-extras";
import { ConversationRow } from "./conversation-row";
import { afterMenuCloses, inboxMenuActions } from "./row-actions";

/**
 * An Inbox row on Android: tap to open, long-press for its actions in a
 * Material menu that drops from the row. The menu's Compose host sits
 * behind the row, so the row still takes every touch. iOS has its own
 * native row (`inbox-row.ios.tsx`).
 */
export function InboxRow({
  conversation,
  showAccount,
}: {
  conversation: ConversationSummary;
  showAccount: boolean;
}) {
  const runAs = useRunAs();
  const destructive = useCSSVariable("--color-destructive");
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <NativeHost style={StyleSheet.absoluteFill}>
        <DropdownMenu
          expanded={expanded}
          onDismissRequest={() => setExpanded(false)}
        >
          <DropdownMenu.Trigger>
            <Box modifiers={[fillMaxSize()]} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {inboxMenuActions(runAs, conversation).map((action) => (
              <DropdownMenuItem
                key={action.key}
                elementColors={
                  action.tone === "destructive" &&
                  typeof destructive === "string"
                    ? { textColor: destructive }
                    : undefined
                }
                onClick={() => {
                  setExpanded(false);
                  afterMenuCloses(action.onPress);
                }}
              >
                <DropdownMenuItem.Text>
                  <Text>{action.label}</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </NativeHost>
      <ConversationRow
        conversation={conversation}
        showAccount={showAccount}
        onLongPress={() => {
          impact();
          setExpanded(true);
        }}
      />
    </View>
  );
}
