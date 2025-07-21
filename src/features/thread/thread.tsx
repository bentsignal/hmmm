"use client";

import { ChevronDown } from "lucide-react";
import useThreadScroll from "./hooks/use-thread-scroll";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";
import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Abyss from "@/components/abyss";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import Messages from "@/features/messages";
import StreamingMessages from "@/features/messages/components/streaming-messages";
import useMessages from "@/features/messages/hooks/use-messages";
import useThreadStore from "@/features/thread/store";

export default function Thread({ threadId }: { threadId: string }) {
  // non streaming messages, used to render the majority of a thread's messages, as
  // well as to dedupe streaming messages
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

  // set tab label in browser to title of thread
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const title = useQuery(api.thread.thread_queries.getThreadTitle, args);
  if (title) {
    document.title = title;
  }

  return (
    <div className="relative h-full w-full flex flex-1 flex-col items-center justify-start">
      <Abyss />
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
