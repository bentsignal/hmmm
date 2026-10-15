import type { Channel, Space } from "@decentralized-convex/messages";
import { Alert } from "react-native";

import type { RowAction } from "~/features/inbox/row-actions";
import type { useChannelSettings } from "~/features/messaging/channel-settings";

type Settings = ReturnType<typeof useChannelSettings>;

/**
 * A channel's long-press menu in its space: Show in Inbox, Hide Alerts,
 * and for owners Rename and Delete. Each shows its change right away.
 */
export function channelMenuActions({
  channel,
  onRename,
  settings,
  space,
}: {
  channel: Channel;
  onRename: () => void;
  settings: Settings;
  space: Space;
}) {
  const { conversationId } = channel;
  const shown = channel.showInInbox !== false;
  const muted = channel.muted === true;
  const inbox = {
    key: "inbox",
    label: shown ? "Hide from Inbox" : "Show in Inbox",
    icon: shown
      ? { android: "visibility_off", ios: "eye.slash" }
      : { android: "visibility", ios: "eye" },
    tone: "gray",
    onPress: () =>
      void settings.setShowInInbox
        .mutateAsync({ conversationId, show: !shown })
        .catch(() => Alert.alert("Couldn't Change Channel", "Try again.")),
  } satisfies RowAction;
  const alerts = {
    key: "alerts",
    label: muted ? "Show Alerts" : "Hide Alerts",
    icon: muted
      ? { android: "notifications", ios: "bell" }
      : { android: "notifications_off", ios: "bell.slash" },
    tone: "gray",
    onPress: () =>
      void settings.setMuted
        .mutateAsync({ conversationId, muted: !muted })
        .catch(() => Alert.alert("Couldn't Change Alerts", "Try again.")),
  } satisfies RowAction;
  const rename = {
    key: "rename",
    label: "Rename",
    icon: { android: "edit", ios: "pencil" },
    tone: "gray",
    onPress: onRename,
  } satisfies RowAction;
  const remove = {
    key: "delete",
    label: "Delete Channel",
    icon: { android: "delete", ios: "trash" },
    tone: "destructive",
    onPress: () =>
      Alert.alert(
        `Delete #${channel.name}?`,
        "Its messages are deleted for everyone in the space.",
        [
          { style: "cancel", text: "Cancel" },
          {
            onPress: () =>
              void settings.deleteChannel
                .mutateAsync({ conversationId })
                .catch(() =>
                  Alert.alert("Couldn't Delete Channel", "Try again."),
                ),
            style: "destructive",
            text: "Delete",
          },
        ],
      ),
  } satisfies RowAction;
  const owner = space.role === "owner";
  return [
    inbox,
    alerts,
    ...(owner ? [rename] : []),
    // A space keeps at least one channel.
    ...(owner && space.channels.length > 1 ? [remove] : []),
  ];
}
