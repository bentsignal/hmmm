import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardGestureArea } from "react-native-keyboard-controller";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { ComposerHandle } from "~/features/conversation/composer";
import type { MessageListHandle } from "~/features/conversation/message-list";
import type { MessageLayout } from "~/features/preferences/store";
import { useComposerBottomInset } from "~/features/conversation/composer";
import {
  CONVERSATION_HEADER_HEIGHT,
  ConversationHeader,
} from "~/features/conversation/conversation-header";
import { FloatingComposer } from "~/features/conversation/floating-composer";
import { MessageList } from "~/features/conversation/message-list";
import { useDevConversation } from "~/features/dev/dev-conversation";
import { useDevTools } from "~/features/dev/dev-tools";
import { AccountScope, useAccount } from "~/features/messaging/account";
import { useConversation } from "~/features/messaging/conversations";
import { useMarkRead, useMessages } from "~/features/messaging/messages";
import { useActiveConversation } from "~/features/notifications/push";
import { useMessageLayout } from "~/features/preferences/store";
import { useReactionsSheet } from "~/features/conversation/use-reactions-sheet";
import { useReplies } from "~/features/conversation/use-replies";

/** The other person in a direct conversation, whose photo heads it. */
function otherMember(
  conversation: ReturnType<typeof useConversation>["conversation"],
  self: string,
) {
  if (conversation?.kind !== "direct") return undefined;
  return conversation.members.find((member) => member !== self);
}

/**
 * The list shows once its messages, their reactions, and everyone's names
 * and photos are in, so nothing changes size or swaps as it fades in.
 */
function listReady(
  loadingMessages: boolean,
  layout: MessageLayout | undefined,
  profilesLoaded: boolean,
): layout is MessageLayout {
  return !loadingMessages && layout !== undefined && profilesLoaded;
}

/** The title from the opening screen shows until the conversation loads. */
function headingFor(title: string, initialTitle: string | undefined) {
  return title === "" ? (initialTitle ?? "") : title;
}

function MissingConversation({ heading }: { heading: string }) {
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
  const composerBottomInset = useComposerBottomInset();
  const { address } = useAccount();
  const devTools = useDevTools();
  const viewReactions = useReactionsSheet(conversationId);
  const { conversation, isLoading, profileOf, profilesLoaded, title } =
    useConversation(conversationId);
  const layout = useMessageLayout(conversation?.kind);
  const messages = useMessages(conversationId, { anchor: anchorId });
  const composer = useRef<ComposerHandle>(null);
  // Undefined until the composer is laid out: the list leaves room for it
  // under the newest message, so it waits rather than shift once it knows.
  const [composerHeight, setComposerHeight] = useState<number>();
  const list = useRef<MessageListHandle>(null);
  useMarkRead(conversationId, messages.newestSentAt);
  useActiveConversation(conversationId);
  useDevConversation(messages);

  const heading = headingFor(title, initialTitle);
  const other = otherMember(conversation, address);
  const replies = useReplies({
    composer,
    conversationId,
    profileOf,
    threadOf: messages.threadOf,
    title: heading,
  });
  if (!isLoading && conversation === undefined) {
    return <MissingConversation heading={heading} />;
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Title>{heading}</Stack.Title>
      <KeyboardGestureArea interpolator="ios" offset={60} style={{ flex: 1 }}>
        {listReady(messages.isLoading, layout, profilesLoaded) &&
          composerHeight !== undefined && (
            <MessageList
              ref={list}
              key={messages.viewKey}
              messages={messages.messages}
              self={address}
              layout={layout}
              profileOf={profileOf}
              showAuthors={conversation?.kind !== "direct"}
              anchorId={messages.anchor}
              hasNewer={messages.hasNewer}
              onLoadOlder={messages.loadOlder}
              onLoadNewer={messages.loadNewer}
              onJumpToLatest={messages.jumpToLatest}
              bottomInset={composerBottomInset}
              topInset={CONVERSATION_HEADER_HEIGHT}
              composerHeight={composerHeight}
              onToggleReaction={messages.toggleReaction}
              onOpenThread={replies.openThread}
              onReply={replies.reply}
              onViewReactions={viewReactions}
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
        ref={composer}
        draftId={conversationId}
        onHeight={setComposerHeight}
        replyingTo={replies.replyingTo}
        onCancelReply={replies.cancel}
        onSend={(body, files, linkPreviews) => {
          messages.sendMessage(body, files, linkPreviews, replies.replyTo);
          replies.cancel();
          list.current?.scrollToLatest();
          devTools.replyToMe(conversationId);
        }}
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
