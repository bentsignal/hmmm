"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import useMessageListScroll from "../hooks/use-message-list-scroll";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import Messages from "./messages";
import StreamingMessage from "./streaming-message";
import { useEffect } from "react";
import useThreadStore from "@/features/thread/store/thread-store";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MessageList({ threadId }: { threadId: string }) {
  // handle auto scroll & scroll to bottom
  const { scrollAreaRef, messagesEndRef, isAtBottom, scrollToBottom } =
    useMessageListScroll({ threadId });

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
  const title = useQuery(api.threads.getThreadTitle, args);
  if (title) {
    document.title = title;
  }

  return (
    <div className="relative h-full w-full">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="flex w-full justify-center pt-20 pb-20">
          <div className="mx-4 mb-8 flex h-full w-full max-w-4xl flex-col gap-16 px-4">
            <Messages threadId={threadId} />
            <StreamingMessage threadId={threadId} />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>
      {!isAtBottom && (
        <div
          className="absolute right-0 bottom-36 z-10 flex w-full items-center justify-center 
          rounded-full p-0 sm:bottom-24"
        >
          <Button
            onClick={scrollToBottom}
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
