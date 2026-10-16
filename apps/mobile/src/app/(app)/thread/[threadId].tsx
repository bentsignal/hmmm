import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardGestureArea } from "react-native-keyboard-controller";
import { Stack, useLocalSearchParams } from "expo-router";

import type { MessageListHandle } from "~/features/conversation/message-list";
import { useComposerBottomInset } from "~/features/conversation/composer";
import { FloatingComposer } from "~/features/conversation/floating-composer";
import { MessageList } from "~/features/conversation/message-list";
import { useReactionsSheet } from "~/features/conversation/use-reactions-sheet";
import {
  THREAD_HEADER_HEIGHT,
  ThreadHeader,
} from "~/features/conversation/thread-header";
import { useDevTools } from "~/features/dev/dev-tools";
import { AccountScope, useAccount } from "~/features/messaging/account";
import { useConversation } from "~/features/messaging/conversations";
import { useMessages } from "~/features/messaging/messages";
import { useMarkThreadRead, useThreadState } from "~/features/messaging/threads";
import { useActiveThread } from "~/features/notifications/push";
import { useMessageLayout } from "~/features/preferences/store";

/** The conversation's name from the opening screen, until it loads. */
function headingFor(title: string, initialTitle: string | undefined) {
  return title === "" ? (initialTitle ?? "") : title;
}

/**
 * What the list needs before it shows: the thread loaded with everyone's
 * names, and the composer laid out (the list leaves room for it).
 */
function shownList<Layout, Root>({
  loading,
  root,
  layout,
  composerHeight,
}: {
  loading: boolean;
  root: Root | undefined;
  layout: Layout | undefined;
  composerHeight: number | undefined;
}) {
  if (loading || root === undefined || layout === undefined) return null;
  if (composerHeight === undefined) return null;
  return { composerHeight, layout, root };
}

/**
 * A thread: the message it answers on top, its replies under it like
 * comments, and a composer for the next reply. Its bell turns its
 * notifications off or back on.
 */
function Thread({
  conversationId,
  threadId,
  focus,
  initialTitle,
}: {
  conversationId: string;
  threadId: string;
  /** Opens with the keyboard up, to reply. */
  focus: boolean;
  initialTitle?: string;
}) {
  const composerBottomInset = useComposerBottomInset();
  const { address } = useAccount();
  const devTools = useDevTools();
  const viewReactions = useReactionsSheet(conversationId);
  const { conversation, profileOf, profilesLoaded, title } =
    useConversation(conversationId);
  const layout = useMessageLayout(conversation?.kind);
  const thread = useMessages(conversationId, { threadId });
  const state = useThreadState(conversationId, threadId);
  const [composerHeight, setComposerHeight] = useState<number>();
  const list = useRef<MessageListHandle>(null);
  useMarkThreadRead(conversationId, threadId, thread.newestSentAt);
  useActiveThread(threadId);

  const heading = headingFor(title, initialTitle);
  const { root } = thread;
  const missing = !thread.isLoading && root === undefined;
  const shown = shownList({
    composerHeight,
    layout,
    loading: thread.isLoading || !profilesLoaded,
    root,
  });

  return (
    <View className="bg-background flex-1">
      <Stack.Title>Thread</Stack.Title>
      {missing && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-body text-muted">
            This message doesn't exist.
          </Text>
        </View>
      )}
      <KeyboardGestureArea interpolator="ios" offset={60} style={{ flex: 1 }}>
        {shown !== null && (
          <MessageList
            ref={list}
            key={thread.viewKey}
            thread={{ replyCount: thread.replyCount, root: shown.root }}
            messages={thread.messages}
            self={address}
            layout={shown.layout}
            profileOf={profileOf}
            showAuthors={conversation?.kind !== "direct"}
            hasNewer={thread.hasNewer}
            onLoadOlder={thread.loadOlder}
            onLoadNewer={thread.loadNewer}
            onJumpToLatest={thread.jumpToLatest}
            bottomInset={composerBottomInset}
            topInset={THREAD_HEADER_HEIGHT}
            composerHeight={shown.composerHeight}
            onToggleReaction={thread.toggleReaction}
            onViewReactions={viewReactions}
          />
        )}
      </KeyboardGestureArea>
      <ThreadHeader
        title={heading}
        following={state.following}
        onToggleFollowing={state.toggle}
      />
      {root !== undefined && (
        <FloatingComposer
          autoFocus={focus}
          placeholder="Reply"
          onHeight={setComposerHeight}
          onSend={(body, files, linkPreviews) => {
            thread.sendMessage(body, files, linkPreviews);
            list.current?.scrollToLatest();
            devTools.replyToMe(conversationId, threadId);
          }}
        />
      )}
    </View>
  );
}

export default function ThreadScreen() {
  const { account, conversationId, focus, threadId, title } =
    useLocalSearchParams<{
      /** The signed-in account this thread is opened as. */
      account?: string;
      conversationId: string;
      /** "1" to open with the keyboard up. */
      focus?: string;
      threadId: string;
      /** The conversation's name, shown until it loads. */
      title?: string;
    }>();
  return (
    <AccountScope address={account}>
      <Thread
        key={`${account ?? ""}:${conversationId}:${threadId}`}
        conversationId={conversationId}
        threadId={threadId}
        focus={focus === "1"}
        initialTitle={title}
      />
    </AccountScope>
  );
}
