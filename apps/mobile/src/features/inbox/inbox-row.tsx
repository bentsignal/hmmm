import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Box,
  DropdownMenu,
  DropdownMenuItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { fillMaxSize } from "@expo/ui/jetpack-compose/modifiers";
import { useCSSVariable } from "uniwind";

import type { RowAction } from "./row-actions";
import type { ConversationSummary, ThreadSummaryRow } from "./types";
import { NativeHost } from "~/components/native-host";
import { useRunAs } from "~/features/messaging/account";
import { impact } from "~/lib/native-extras";
import { ConversationRow, INBOX_ROW_HEIGHT } from "./conversation-row";
import {
  afterMenuCloses,
  inboxMenuActions,
  threadMenuActions,
} from "./row-actions";
import { conversationHref, threadHref } from "./thread-links";
import { ThreadRowContent } from "./thread-row";

/**
 * A row whose long-press opens `actions` in a Material menu that drops
 * from the row. The menu's Compose host sits behind the row, so the row
 * (`children`, given the long-press handler) still takes every touch.
 */
function MenuRow({
  actions,
  children,
}: {
  actions: readonly RowAction[];
  children: (onLongPress: () => void) => ReactNode;
}) {
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
            {actions.map((action) => (
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
      {children(() => {
        impact();
        setExpanded(true);
      })}
    </View>
  );
}

/**
 * An Inbox row on Android: tap to open, long-press for its actions in a
 * Material menu (see `MenuRow`). iOS has its own native row
 * (`inbox-row.ios.tsx`).
 */
export function InboxRow({
  conversation,
  showAccount,
}: {
  conversation: ConversationSummary;
  showAccount: boolean;
}) {
  const runAs = useRunAs();
  return (
    <MenuRow actions={inboxMenuActions(runAs, conversation)}>
      {(onLongPress) => (
        <ConversationRow
          conversation={conversation}
          showAccount={showAccount}
          onLongPress={onLongPress}
        />
      )}
    </MenuRow>
  );
}

/** A thread's Inbox row on Android, which opens the thread. */
export function ThreadInboxRow({
  thread,
  showAccount,
}: {
  thread: ThreadSummaryRow;
  showAccount: boolean;
}) {
  const router = useRouter();
  const runAs = useRunAs();
  const actions = threadMenuActions(runAs, thread, () =>
    router.push(conversationHref(thread)),
  );
  return (
    <MenuRow actions={actions}>
      {(onLongPress) => (
        <Pressable
          className="active:bg-fill flex-row"
          style={{ height: INBOX_ROW_HEIGHT }}
          onPress={() => router.push(threadHref(thread))}
          onLongPress={onLongPress}
        >
          <ThreadRowContent thread={thread} showAccount={showAccount} />
        </Pressable>
      )}
    </MenuRow>
  );
}
