"use client";

import { ChevronDown } from "lucide-react";
import useThreadScroll from "./hooks/use-thread-scroll";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";
import { useEffect, useState } from "react";
import useMessageStore from "../messages/store/message-store";
import ThreadTitleUpdater from "./components/thread-title-updater";
import useThreadStatus from "./hooks/use-thread-status";
import Abyss from "@/components/abyss";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import Messages from "@/features/messages";
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

  // thread is not idle if waiting for a response, or if a response is streaming in
  const { isThreadIdle } = useThreadStatus({ threadId });

  return (
    <div className="relative flex h-full w-full flex-1 flex-col items-center justify-start">
      <ThreadTitleUpdater threadId={threadId} />
      <Abyss />
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="mx-auto mb-8 flex h-full w-full max-w-4xl flex-col gap-3 place-self-center px-8 pt-24 pb-32 sm:mb-0">
          <Messages
            threadId={threadId}
            triggerMessagesLoaded={() => setMessagesLoaded(true)}
            isThreadIdle={isThreadIdle}
          />
          <UsageChatCallout hide={!isThreadIdle} />
          <Bumper />
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      {!isAtBottom && (
        <div className="absolute right-0 bottom-36 z-10 flex w-full items-center justify-center rounded-full p-0 sm:bottom-24">
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

// if a new message has been sent since the thread has been opened, add whitespace to
// the bottom of the page. that way when a new message is sent, we can autoscroll up
// the page a bit, and have more of the response shown when it arrives
const Bumper = () => {
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);
  const [initialLength] = useState(() => numMessagesSent);
  const hasNewMessages = numMessagesSent != initialLength;
  if (!hasNewMessages) return null;
  return <div className="min-h-[50vh] w-full max-w-full" />;
};
