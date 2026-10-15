import { Button, ContextMenu } from "@expo/ui/swift-ui";

import type { ChannelRowProps } from "./channel-row-content";
import type { RowAction } from "~/features/inbox/row-actions";
import { afterMenuCloses } from "~/features/inbox/row-actions";
import { ChannelListItem } from "./channel-row-content";

/**
 * A channel in its space on iOS: tap to open it, long-press for the
 * system context menu of its settings (`channelMenuActions`).
 * `channel-row.android.tsx` drops a Material menu from the row instead.
 */
export function ChannelRow({ actions, channel, onOpen }: ChannelRowProps) {
  return (
    <ContextMenu>
      <ContextMenu.Items>
        {actions.map((action: RowAction) => (
          <Button
            key={action.key}
            label={action.label}
            systemImage={action.icon.ios}
            role={action.tone === "destructive" ? "destructive" : undefined}
            onPress={() => afterMenuCloses(action.onPress)}
          />
        ))}
      </ContextMenu.Items>
      <ContextMenu.Trigger>
        <ChannelListItem channel={channel} onPress={onOpen} />
      </ContextMenu.Trigger>
    </ContextMenu>
  );
}
