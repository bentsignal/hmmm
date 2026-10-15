import type { Channel } from "@decentralized-convex/messages";
import type { ListItemProps } from "@expo/ui";
import { Row } from "@expo/ui";

import type { RowAction } from "~/features/inbox/row-actions";
import { ListItem } from "~/components/list-item";
import { SymbolIcon } from "~/components/symbol-icon";
import { UnreadBadge } from "~/components/unread-badge";

export interface ChannelRowProps {
  actions: readonly RowAction[];
  channel: Channel;
  onOpen: () => void;
}

/**
 * A channel's row: its name, a bell while its alerts are hidden, and its
 * unread count. Android passes its taps as `modifiers` (a long press
 * included); iOS passes `onPress` and wraps the row in a menu.
 */
export function ChannelListItem({
  channel,
  modifiers,
  onPress,
}: {
  channel: Channel;
  modifiers?: ListItemProps["modifiers"];
  onPress?: () => void;
}) {
  return (
    <ListItem
      leading={
        <SymbolIcon
          name={{ android: "tag", ios: "number" }}
          size={20}
          tintColorClassName="accent-accent"
        />
      }
      trailing={
        <Row alignment="center" spacing={6}>
          {channel.muted === true && (
            <SymbolIcon
              accessibilityLabel="Alerts hidden"
              name={{ android: "notifications_off", ios: "bell.slash.fill" }}
              size={14}
              tintColorClassName="accent-muted"
            />
          )}
          <UnreadBadge count={channel.unreadCount} />
        </Row>
      }
      modifiers={modifiers}
      onPress={onPress}
    >
      {channel.name}
    </ListItem>
  );
}
