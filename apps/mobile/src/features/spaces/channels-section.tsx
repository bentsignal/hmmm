import type { Space } from "@decentralized-convex/messages";
import { useRouter } from "expo-router";
import { FieldGroup, Text } from "@expo/ui";

import { SectionHeaderWithAdd } from "~/components/section-header";
import { SectionTitle } from "~/components/section-title";
import { useAccount } from "~/features/messaging/account";
import { useChannelSettings } from "~/features/messaging/channel-settings";
import { channelMenuActions } from "./channel-actions";
import { ChannelRow } from "./channel-row";

/**
 * The space's text channels. Tap one to open it; touch and hold for its
 * settings (Show in Inbox, Hide Alerts, and for owners Rename and Delete).
 */
export function ChannelsSection({ space }: { space: Space }) {
  const router = useRouter();
  const { address: account } = useAccount();
  const settings = useChannelSettings();
  return (
    <FieldGroup.Section>
      <FieldGroup.SectionHeader>
        {space.role === "owner" ? (
          <SectionHeaderWithAdd
            title="Text Channels"
            onAdd={() =>
              router.push({
                params: { account, spaceId: space.spaceId },
                pathname: "/new-channel",
              })
            }
          />
        ) : (
          <SectionTitle>Text Channels</SectionTitle>
        )}
      </FieldGroup.SectionHeader>
      {space.channels.map((channel) => (
        <ChannelRow
          key={channel.conversationId}
          channel={channel}
          actions={channelMenuActions({
            channel,
            onRename: () =>
              router.push({
                params: {
                  account,
                  conversationId: channel.conversationId,
                  name: channel.name,
                  spaceId: space.spaceId,
                },
                pathname: "/new-channel",
              }),
            settings,
            space,
          })}
          onOpen={() =>
            router.push({
              params: {
                account,
                conversationId: channel.conversationId,
                title: `#${channel.name}`,
              },
              pathname: "/conversation/[conversationId]",
            })
          }
        />
      ))}
      <FieldGroup.SectionFooter>
        <Text>
          Touch and hold a channel to hide it from your Inbox or hide its
          alerts.
        </Text>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}
