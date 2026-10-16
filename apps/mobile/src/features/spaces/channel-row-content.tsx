import type { Channel } from "@decentralized-convex/messages";
import type { ListItemProps } from "@expo/ui";
import { Row } from "@expo/ui";

import type { RowAction } from "~/features/inbox/row-actions";
import { ListItem } from "~/components/list-item";
import { SymbolIcon } from "~/components/symbol-icon";
import { UnreadBadge } from "~/components/unread-badge";
import { alertsIcon } from "~/features/messaging/alerts";

export interface ChannelRowProps {
  actions: readonly RowAction[];
  channel: Channel;
  onOpen: () => void;
}

/**
 * A channel's row: its name, a crossed-out bell while its alerts are
 * hidden or an @ while it alerts only about mentions (its own choice, not
 * its space's), and its unread count. Android passes its taps as `modifiers` (a long press
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
  const icon = alertsIcon(
    channel.alerts ?? (channel.muted === true ? "none" : "all"),
  );
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
          {icon !== null && (
            <SymbolIcon
              accessibilityLabel={icon.label}
              name={icon.name}
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
