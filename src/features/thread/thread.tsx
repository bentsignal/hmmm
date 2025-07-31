"use client";

import { ChevronDown } from "lucide-react";
import useThreadScroll from "./hooks/use-thread-scroll";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";
import { useEffect, useState } from "react";
import ThreadTitleUpdater from "./components/thread-title-updater";
import useThreadStatus from "./hooks/use-thread-status";
import Abyss from "@/components/abyss";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import Messages from "@/features/messages";
import useMessages from "@/features/messages/hooks/use-messages";
import ThreadFooter from "@/features/thread/components/thread-footer";
import useThreadStore from "@/features/thread/store";

export default function Thread({ threadId }: { threadId: string }) {
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // auto scroll when new messages are sent, show/hide/handle scroll to bottom button
  const { scrollAreaRef, messagesEndRef, isAtBottom, scrollToBottom } =
    useThreadScroll({ messagesLoaded });

  // set active thread when component mounts
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  useEffect(() => {
    setActiveThread(threadId);
    return () => {
      setActiveThread(null);
    };
  }, [threadId, setActiveThread]);

  return (
    <div className="relative h-full w-full flex flex-1 flex-col items-center justify-start">
      <ThreadTitleUpdater threadId={threadId} />
      <Abyss />
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div
          className="flex h-full w-full max-w-4xl place-self-center mx-auto
          flex-col gap-16 py-24 px-8 mb-8 sm:mb-0"
        >
          <MessageAreaWrapper
            threadId={threadId}
            triggerMessagesLoaded={() => setMessagesLoaded(true)}
          />
          <UsageChatCallout />
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      {!isAtBottom && (
        <div
          className="absolute right-0 bottom-36 z-10 flex w-full
          items-center justify-center rounded-full p-0 sm:bottom-24"
        >
          <Button
            onClick={() => scrollToBottom()}
            className="font-semibold shadow-lg"
            variant="default"
          >
            Scroll to bottom <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

const MessageAreaWrapper = ({
  threadId,
  triggerMessagesLoaded,
}: {
  threadId: string;
  triggerMessagesLoaded: () => void;
}) => {
  const { messages, loadMore, status } = useMessages({
    threadId,
    streaming: true,
  });
  const { isThreadIdle } = useThreadStatus({ threadId });

  // when messages have loaded, parent component will auto scroll to bottom of page
  useEffect(() => {
    if (messages.length > 0) {
      triggerMessagesLoaded();
    }
  }, [messages.length, triggerMessagesLoaded]);

  return (
    <>
      <Messages
        messages={messages}
        loadMore={loadMore}
        loadingStatus={status}
        isIdle={isThreadIdle}
      />
      <ThreadFooter threadId={threadId} messages={messages} />
    </>
  );
};
