import type { LinkCard } from "@decentralized-convex/messages";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  KeyboardGestureArea,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type {
  AttachmentSource,
  StagedFile,
} from "~/features/messaging/attachments";
import { Composer } from "~/features/conversation/composer";
import {
  CONVERSATION_HEADER_HEIGHT,
  ConversationHeader,
} from "~/features/conversation/conversation-header";
import { MessageList } from "~/features/conversation/message-list";
import { useDevTools } from "~/features/dev/dev-tools";
import { AccountScope, useAccount } from "~/features/messaging/account";
import {
  MAX_ATTACHMENTS,
  pickAttachments,
} from "~/features/messaging/attachments";
import {
  useConversation,
  useMarkRead,
  useMessages,
} from "~/features/messaging/conversations";
import { useLinkPrefetch } from "~/features/messaging/link-previews";
import { useActiveConversation } from "~/features/notifications/push";
import { useMessageLayout } from "~/features/preferences/store";

/**
 * The composer floating over the bottom of the conversation, holding what's
 * picked for the next message until it's sent. Reports its height so
 * messages can scroll under it.
 */
function FloatingComposer({
  conversationId,
  onHeight,
  onSend,
}: {
  conversationId: string;
  onHeight: (height: number) => void;
  onSend: (
    body: string,
    files: readonly StagedFile[],
    linkPreviews: readonly LinkCard[],
  ) => void;
}) {
  const insets = useSafeAreaInsets();
  const links = useLinkPrefetch();
  const devTools = useDevTools();
  const [staged, setStaged] = useState<readonly StagedFile[]>([]);
  const [picking, setPicking] = useState(false);

  async function pick(source: AttachmentSource) {
    if (staged.length >= MAX_ATTACHMENTS) {
      Alert.alert(
        "Too Many Attachments",
        `You can send up to ${MAX_ATTACHMENTS} at a time.`,
      );
      return;
    }
    // The placeholder opens behind the picker, so it's already there when
    // the picker closes and the files take a moment to arrive.
    setPicking(true);
    const files = await pickAttachments(source, {
      limit: MAX_ATTACHMENTS - staged.length,
    });
    setPicking(false);
    setStaged((current) => [...current, ...files].slice(0, MAX_ATTACHMENTS));
  }

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      // Floats over the messages, which scroll all the way to the bottom.
      style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
    >
      <View style={{ paddingBottom: insets.bottom }}>
        <Composer
          staged={staged}
          preparing={picking}
          onChangeText={links.onChangeText}
          onPick={(source) => void pick(source)}
          onRemoveStaged={(id) =>
            setStaged((current) => current.filter((file) => file.id !== id))
          }
          onSend={(body) => {
            onSend(body, staged, links.cardsFor(body));
            setStaged([]);
            devTools.replyToMe(conversationId);
          }}
        />
      </View>
    </KeyboardStickyView>
  );
}

/** The other person in a direct conversation, whose photo heads it. */
function otherMember(
  conversation: ReturnType<typeof useConversation>["conversation"],
  self: string,
) {
  if (conversation?.kind !== "direct") return undefined;
  return conversation.members.find((member) => member !== self);
}

/** The title from the opening screen shows until the conversation loads. */
function headingFor(title: string, initialTitle: string | undefined) {
  return title === "" ? (initialTitle ?? "") : title;
}

function Conversation({
  conversationId,
  anchorId,
  initialTitle,
}: {
  conversationId: string;
  anchorId?: string;
  initialTitle?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useAccount();
  const { conversation, isLoading, profileOf, title } =
    useConversation(conversationId);
  const layout = useMessageLayout(conversation?.kind);
  const messages = useMessages(conversationId, anchorId);
  const [composerHeight, setComposerHeight] = useState(56);
  useMarkRead(conversationId, messages.newestSentAt);
  useActiveConversation(conversationId);

  const heading = headingFor(title, initialTitle);
  const other = otherMember(conversation, address);
  if (!isLoading && conversation === undefined) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Title>{heading}</Stack.Title>
        <Text className="text-body text-muted">
          This conversation doesn't exist.
        </Text>
        <ConversationHeader title={heading} avatarUrl={null} />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Title>{heading}</Stack.Title>
      <KeyboardGestureArea interpolator="ios" offset={60} style={{ flex: 1 }}>
        {messages.isLoading || layout === undefined ? null : (
          <MessageList
            key={messages.viewKey}
            messages={messages.messages}
            self={address}
            layout={layout}
            profileOf={profileOf}
            showAuthors={conversation?.kind !== "direct"}
            anchorId={messages.anchor}
            hasNewer={messages.hasNewer}
            onStartReached={messages.loadOlder}
            onEndReached={messages.loadNewer}
            onJumpToLatest={messages.jumpToLatest}
            bottomInset={insets.bottom}
            topInset={CONVERSATION_HEADER_HEIGHT}
            composerHeight={composerHeight}
            onToggleReaction={messages.toggleReaction}
            onViewReactions={(messageId) =>
              router.push({
                params: { account: address, conversationId, messageId },
                pathname: "/reactions",
              })
            }
          />
        )}
      </KeyboardGestureArea>
      <ConversationHeader
        title={heading}
        kind={conversation?.kind}
        avatarUrl={other === undefined ? null : profileOf(other).avatarUrl}
        affiliated={other !== undefined && profileOf(other).affiliated}
        onOpenInfo={() =>
          router.push({
            params: { account: address, conversationId, title: heading },
            pathname: "/conversation-info/[conversationId]",
          })
        }
      />
      <FloatingComposer
        conversationId={conversationId}
        onHeight={setComposerHeight}
        onSend={messages.sendMessage}
      />
    </View>
  );
}

export default function ConversationScreen() {
  const { account, conversationId, messageId, title } = useLocalSearchParams<{
    /** The signed-in account this conversation is opened as. */
    account?: string;
    conversationId: string;
    messageId?: string;
    title?: string;
  }>();
  return (
    <AccountScope address={account}>
      <Conversation
        key={`${account ?? ""}:${conversationId}:${messageId ?? ""}`}
        conversationId={conversationId}
        anchorId={messageId}
        initialTitle={title}
      />
    </AccountScope>
  );
}
