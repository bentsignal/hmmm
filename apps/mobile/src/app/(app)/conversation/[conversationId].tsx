import type { LinkCard, Mention } from "@decentralized-convex/messages";
import { useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  KeyboardGestureArea,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { MentionCandidate } from "~/features/conversation/mention-text";
import type { MessageListHandle } from "~/features/conversation/message-list";
import type {
  AttachmentSource,
  StagedFile,
} from "~/features/messaging/attachments";
import type { MessageLayout } from "~/features/preferences/store";
import type { PastedImage } from "~/lib/paste-images";
import {
  Composer,
  useComposerBottomInset,
} from "~/features/conversation/composer";
import {
  CONVERSATION_HEADER_HEIGHT,
  ConversationHeader,
} from "~/features/conversation/conversation-header";
import { MessageList } from "~/features/conversation/message-list";
import { useDevConversation } from "~/features/dev/dev-conversation";
import { useDevTools } from "~/features/dev/dev-tools";
import { AccountScope, useAccount } from "~/features/messaging/account";
import {
  MAX_ATTACHMENTS,
  pickAttachments,
  stagePasted,
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
  mentionable,
  onHeight,
  onSend,
}: {
  conversationId: string;
  mentionable: readonly MentionCandidate[] | undefined;
  onHeight: (height: number) => void;
  onSend: (
    body: string,
    files: readonly StagedFile[],
    linkPreviews: readonly LinkCard[],
    mentions: readonly Mention[],
  ) => void;
}) {
  const bottomInset = useComposerBottomInset();
  const links = useLinkPrefetch();
  const devTools = useDevTools();
  const [staged, setStaged] = useState<readonly StagedFile[]>([]);
  // One picker at a time: a second tap on the menu while one is still
  // handing over files does nothing.
  const picking = useRef(false);

  function full() {
    if (staged.length < MAX_ATTACHMENTS) return false;
    Alert.alert(
      "Too Many Attachments",
      `You can send up to ${MAX_ATTACHMENTS} at a time.`,
    );
    return true;
  }

  function add(files: readonly StagedFile[]) {
    setStaged((current) => [...current, ...files].slice(0, MAX_ATTACHMENTS));
  }

  async function pick(source: AttachmentSource) {
    if (picking.current || full()) return;
    // Nothing shows in the composer until the files are ready; then they
    // animate in.
    picking.current = true;
    const files = await pickAttachments(source, {
      limit: MAX_ATTACHMENTS - staged.length,
    }).finally(() => {
      picking.current = false;
    });
    add(files);
  }

  function paste(images: readonly PastedImage[]) {
    if (full()) return;
    add(stagePasted(images, MAX_ATTACHMENTS - staged.length));
  }

  return (
    <KeyboardStickyView
      // With the keyboard up, the inset below the bar goes behind it.
      offset={{ closed: 0, opened: bottomInset }}
      // Floats over the messages, which scroll all the way to the bottom.
      style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
    >
      <Composer
        bottomInset={bottomInset}
        staged={staged}
        mentionable={mentionable}
        // The people to mention open above the bar, over the messages,
        // so only the bar leaves them room.
        onHeight={onHeight}
        onChangeText={links.onChangeText}
        onPick={(source) => void pick(source)}
        onPaste={paste}
        onRemoveStaged={(id) =>
          setStaged((current) => current.filter((file) => file.id !== id))
        }
        onSend={(body, mentions) => {
          onSend(body, staged, links.cardsFor(body), mentions);
          setStaged([]);
          devTools.replyToMe(conversationId);
        }}
      />
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

/** Everyone in a group or channel but you; nobody in a direct message. */
function mentionableIn(
  conversation: ReturnType<typeof useConversation>["conversation"],
  self: string,
  profileOf: ReturnType<typeof useConversation>["profileOf"],
) {
  if (conversation === undefined || conversation.kind === "direct") {
    return undefined;
  }
  return conversation.members
    .filter((member) => member !== self)
    .map((accountId) => {
      const { avatarUrl, displayName } = profileOf(accountId);
      return { accountId, avatarUrl, displayName };
    });
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
  const composerBottomInset = useComposerBottomInset();
  const { address } = useAccount();
  const { conversation, isLoading, profileOf, profilesLoaded, title } =
    useConversation(conversationId);
  const layout = useMessageLayout(conversation?.kind);
  const messages = useMessages(conversationId, anchorId);
  // Undefined until the composer is laid out: the list leaves room for it
  // under the newest message, so it waits rather than shift once it knows.
  const [composerHeight, setComposerHeight] = useState<number>();
  const list = useRef<MessageListHandle>(null);
  useMarkRead(conversationId, messages.newestSentAt);
  useActiveConversation(conversationId);
  useDevConversation(messages);

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
              onViewReactions={(messageId, emoji) =>
                router.push({
                  params: {
                    account: address,
                    conversationId,
                    emoji,
                    messageId,
                  },
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
        mentionable={mentionableIn(conversation, address, profileOf)}
        onHeight={setComposerHeight}
        onSend={(body, files, linkPreviews, mentions) => {
          messages.sendMessage({ body, files, linkPreviews, mentions });
          list.current?.scrollToLatest();
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
