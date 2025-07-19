"use client";

import { ChevronDown } from "lucide-react";
import useThreadScroll from "../hooks/use-thread-scroll";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import Messages from "@/features/message/components/messages";
import StreamingMessages from "@/features/message/components/streaming-messages";
import useMessages from "@/features/message/hooks/use-messages";
import useThreadStore from "@/features/thread/store/thread-store";

export default function MessageList({ threadId }: { threadId: string }) {
  const { messages, loadMore, status } = useMessages({
    threadId,
  });
  // auto scroll when new messages are sent, show/hide/handle scroll to bottom button
  const { scrollAreaRef, messagesEndRef, isAtBottom, scrollToBottom } =
    useThreadScroll({ messages });

  // set active thread when component mounts
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  useEffect(() => {
    setActiveThread(threadId);
    return () => {
      setActiveThread(null);
    };
  }, [threadId, setActiveThread]);

  // set tab label in browser to thread title
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const title = useQuery(api.thread.thread_queries.getThreadTitle, args);
  if (title) {
    document.title = title;
  }

  return (
    <div className="relative h-full w-full flex flex-1 flex-col items-center justify-start">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div
          className="flex h-full w-full max-w-4xl place-self-center mx-auto
          flex-col gap-16 py-24 px-8 mb-8 sm:mb-0"
        >
          <Messages messages={messages} loadMore={loadMore} status={status} />
          <StreamingMessages threadId={threadId} messages={messages} />
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
