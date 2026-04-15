import type { Ref } from "react";
import { useRef, useState } from "react";

import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";

import type { LegendListRef } from "@legendapp/list/react";
import { LegendList } from "@legendapp/list/react";

import {
  PAGE_SIZE,
  responseHasNoContent,
  useMessages,
} from "@acme/features/messages";
import { Loader } from "@acme/ui/loader";

import { UsageChatCallout } from "~/features/billing/components/usage-chat-callout";
import { ThreadFollowUps } from "../thread/components/thread-follow-ups";
import { Message } from "./components/message";

const AT_END_THRESHOLD_PX = 2000;

// Explicit MVCP config: anchor on data changes (so older messages prepended by
// `loadMore` don't yank scroll position) AND stabilize through item size
// changes (streaming content). JSX-shorthand `true` would also do both, but
// passing `true` toggles RN's own MVCP which we don't want here.
const MVCP_CONFIG = { data: true, size: true } as const;

export function Messages({
  threadId,
  isThreadIdle,
  hasSent,
  ref,
  onIsAtEndChange,
}: {
  threadId: string;
  isThreadIdle: boolean;
  hasSent: boolean;
  ref?: Ref<LegendListRef>;
  onIsAtEndChange: (atEnd: boolean) => void;
}) {
  const {
    messages: pureMessages,
    loadMore,
    status,
  } = useMessages({
    threadId,
    streaming: true,
  });

  const messages = pureMessages.filter((item) => item.role !== "system");

  const lastMessage = messages[messages.length - 1];
  const waiting =
    messages.length > 0 &&
    lastMessage !== undefined &&
    (lastMessage.role === "user" || responseHasNoContent(lastMessage));

  const canLoadMore = status === "CanLoadMore";

  // Why this is split into `onLoad` + imperative scroll instead of
  // `initialScrollAtEnd`: on web, `initialScrollAtEnd` activates LegendList's
  // "bootstrap initial scroll" session which keeps `state.initialScroll` set,
  // and LegendList's internal `checkAtTop` bails out whenever that's set —
  // meaning `onStartReached` never fires and infinite-scroll-to-top is dead.
  //
  // Instead:
  //   - Mount with opacity 0 (list is invisible).
  //   - When LegendList's `onLoad` fires (containers are laid out and the
  //     list is ready), synchronously call `scrollToEnd({ animated: false })`.
  //     On web this maps to a DOM `scrollTo` which commits `scrollTop`
  //     synchronously, *before* the next browser paint.
  //   - In the same `onLoad` callback, flip `visible` to true. React's
  //     commit happens on the same tick, so the browser's next paint shows
  //     the list already at the bottom, fading in from opacity 0 → 1.
  const listRef = useRef<LegendListRef>(null);
  const [visible, setVisible] = useState(false);

  return (
    <LegendList
      ref={(instance: LegendListRef | null) => {
        listRef.current = instance;
        if (typeof ref === "function") {
          ref(instance);
        } else if (ref) {
          ref.current = instance;
        }
      }}
      data={messages}
      keyExtractor={(item, index) => {
        const isLast = index === messages.length - 1;
        const isStreaming = isLast && !isThreadIdle;
        return isStreaming ? "last-streaming-message" : item.id;
      }}
      estimatedItemSize={240}
      recycleItems
      maintainVisibleContentPosition={MVCP_CONFIG}
      onLoad={() => {
        void listRef.current?.scrollToEnd({ animated: false });
        setVisible(true);
      }}
      onStartReached={() => {
        if (canLoadMore) loadMore(PAGE_SIZE);
      }}
      onStartReachedThreshold={1.5}
      onEndReachedThreshold={0.5}
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
      onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const distanceFromEnd =
          contentSize.height - (contentOffset.y + layoutMeasurement.height);
        onIsAtEndChange(distanceFromEnd <= AT_END_THRESHOLD_PX);
      }}
      ListHeaderComponent={<div style={{ height: 96 }} />}
      ListFooterComponent={
        <MessagesFooter
          waiting={waiting}
          isThreadIdle={isThreadIdle}
          hasSent={hasSent}
          threadId={threadId}
        />
      }
      renderItem={({ item, index }) => (
        <MessageRow
          item={item}
          isLast={index === messages.length - 1}
          isThreadIdle={isThreadIdle}
        />
      )}
    />
  );
}

function MessageRow({
  item,
  isLast,
  isThreadIdle,
}: {
  item: ReturnType<typeof useMessages>["messages"][number];
  isLast: boolean;
  isThreadIdle: boolean;
}) {
  const isStreaming = isLast && !isThreadIdle;
  return (
    <div
      className={`mx-auto w-full max-w-4xl px-8 ${isLast ? "pb-6" : "pb-16"}`}
    >
      <Message message={item} isActive={isStreaming} />
    </div>
  );
}

function MessagesFooter({
  waiting,
  isThreadIdle,
  hasSent,
  threadId,
}: {
  waiting: boolean;
  isThreadIdle: boolean;
  hasSent: boolean;
  threadId: string;
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-8 pb-32">
        {waiting && (
          <div className="flex items-start justify-start">
            <Loader variant="typing" size="md" />
          </div>
        )}
        <UsageChatCallout hide={!isThreadIdle} />
        {!waiting && <ThreadFollowUps threadId={threadId} />}
      </div>
      {hasSent && <div style={{ minHeight: "50vh" }} />}
    </>
  );
}
