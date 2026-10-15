import { useState } from "react";
import { DropdownMenu, DropdownMenuItem, Text } from "@expo/ui/jetpack-compose";
import { combinedClickable } from "@expo/ui/jetpack-compose/modifiers";
import { useCSSVariable } from "uniwind";

import type { ChannelRowProps } from "./channel-row-content";
import { afterMenuCloses } from "~/features/inbox/row-actions";
import { impact } from "~/lib/native-extras";
import { ChannelListItem } from "./channel-row-content";

/**
 * A channel in its space on Android: tap to open it, long-press for a
 * Material menu of its settings, dropped from the row.
 */
export function ChannelRow({ actions, channel, onOpen }: ChannelRowProps) {
  const destructive = useCSSVariable("--color-destructive");
  const [expanded, setExpanded] = useState(false);
  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
    >
      <DropdownMenu.Trigger>
        <ChannelListItem
          channel={channel}
          modifiers={[
            combinedClickable({
              onClick: onOpen,
              onLongClick: () => {
                impact();
                setExpanded(true);
              },
            }),
          ]}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            elementColors={
              action.tone === "destructive" && typeof destructive === "string"
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
  );
}
