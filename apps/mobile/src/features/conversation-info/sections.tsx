import type { Conversation } from "@decentralized-convex/messages";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { pdsMutation } from "@decentralized-convex/tanstack-query";
import { Button, FieldGroup, Text } from "@expo/ui";
import { pds } from "@vera/backend/pds";

import { Avatar } from "~/components/avatar";
import { ListItem } from "~/components/list-item";
import { OptimisticChoice } from "~/components/optimistic-choice";
import { OptimisticSwitch } from "~/components/optimistic-switch";
import { useAccount } from "~/features/messaging/account";
import { ALERT_CHOICES, conversationAlerts } from "~/features/messaging/alerts";
import { showSetAlerts } from "~/features/messaging/channel-settings";
import { useProfiles } from "~/features/messaging/profiles";
import { useOpenProfile } from "~/features/profile/use-open-profile";
import { secondaryTextStyle } from "~/lib/colors";
import { destructive } from "~/lib/ui-modifiers";

/** Everyone in a group or channel; tapping someone opens their profile. */
export function MembersSection({ members }: { members: readonly string[] }) {
  const { address: self } = useAccount();
  const profileOf = useProfiles(members);
  const openProfile = useOpenProfile();
  return (
    <FieldGroup.Section title={`${members.length} Members`}>
      {members.map((member) => {
        const profile = profileOf(member);
        return (
          <ListItem
            key={member}
            leading={
              <Avatar
                name={profile.displayName}
                size="row"
                uri={profile.avatarUrl}
              />
            }
            supportingText={
              <Text textStyle={secondaryTextStyle}>
                {member === self ? `${member} · You` : member}
              </Text>
            }
            onPress={() => openProfile(member)}
          >
            {profile.displayName}
          </ListItem>
        );
      })}
    </FieldGroup.Section>
  );
}

/**
 * Pinning to the top of the Inbox, whether a channel shows there, and its
 * alerts: iMessage's "Hide Alerts" for a direct message, and for a group
 * or channel all messages, only @mentions, or nothing.
 */
export function InboxSection({
  conversation,
}: {
  conversation: Pick<
    Conversation,
    "alerts" | "conversationId" | "kind" | "muted" | "pinnedAt" | "showInInbox"
  >;
}) {
  const { address } = useAccount();
  const { conversationId } = conversation;
  const setPinned = useMutation(
    pdsMutation({ mutation: pds.messages.setPinned, session: address }),
  );
  const setShowInInbox = useMutation(
    pdsMutation({ mutation: pds.messages.setShowInInbox, session: address }),
  );
  const setMuted = useMutation(
    pdsMutation({ mutation: pds.messages.setMuted, session: address }),
  );
  const setAlerts = useMutation(
    pdsMutation({
      mutation: pds.messages.setAlerts,
      optimisticUpdate: showSetAlerts,
      session: address,
    }),
  );
  return (
    <FieldGroup.Section>
      {conversation.kind === "channel" && (
        <OptimisticSwitch
          label="Show in Inbox"
          value={conversation.showInInbox !== false}
          onChange={(show) =>
            setShowInInbox.mutateAsync({ conversationId, show })
          }
        />
      )}
      <OptimisticSwitch
        label="Pin in Inbox"
        value={conversation.pinnedAt !== undefined}
        onChange={(pinned) => setPinned.mutateAsync({ conversationId, pinned })}
      />
      {conversation.kind === "direct" ? (
        <OptimisticSwitch
          label="Hide Alerts"
          value={conversation.muted}
          onChange={(muted) => setMuted.mutateAsync({ conversationId, muted })}
        />
      ) : (
        <OptimisticChoice
          label="Notify Me About"
          value={conversationAlerts(conversation)}
          choices={ALERT_CHOICES}
          onChange={(alerts) =>
            setAlerts.mutateAsync({ alerts, conversationId })
          }
        />
      )}
      {conversation.kind !== "direct" && (
        <FieldGroup.SectionFooter>
          <Text>What shows in Activity and sends you notifications.</Text>
        </FieldGroup.SectionFooter>
      )}
    </FieldGroup.Section>
  );
}

export function LeaveSection({
  conversationId,
  name,
}: {
  conversationId: string;
  name: string;
}) {
  const router = useRouter();
  const { address } = useAccount();
  const leave = useMutation(
    pdsMutation({ mutation: pds.messages.leaveConversation, session: address }),
  );

  function confirm() {
    Alert.alert(`Leave ${name}?`, "You won't get new messages from it.", [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => {
          leave.mutate({ conversationId });
          // The conversation is gone for you, so go back to the Inbox.
          router.dismissAll();
        },
        style: "destructive",
        text: "Leave",
      },
    ]);
  }

  return (
    <FieldGroup.Section>
      <Button
        label="Leave this Conversation"
        variant="text"
        modifiers={destructive}
        onPress={confirm}
      />
    </FieldGroup.Section>
  );
}
