"use client";

import { api } from "@/convex/_generated/api";
import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import useMessageListScroll from "../hooks/use-message-list-scroll";
import "./tokyo-night-dark.min.css";
import "./message-styles.css";
import { memo } from "react";
// import "flowtoken/dist/styles.css";

const MemoizedPrompt = memo(PromptMessage);
const MemoizedResponse = memo(ResponseMessage);

export default function MessageList({ threadId }: { threadId: string }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const messages = useThreadMessages(api.threads.getThreadMessages, args, {
    initialNumItems: 10,
    stream: true,
  });
  const uiMessages = toUIMessages(messages?.results ?? []);
  const { scrollAreaRef, messagesEndRef, isAtBottom, scrollToBottom } =
    useMessageListScroll(uiMessages.length);

  if (isLoading) return null;

  return (
    <div className="relative h-full w-full">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="flex w-full justify-center pt-20 pb-20">
          <div className="mx-4 mb-8 flex h-full w-full max-w-4xl flex-col gap-16 px-4">
            {uiMessages.map((item) =>
              item.role === "user" ? (
                <div key={item.id} className="flex items-end justify-end">
                  <MemoizedPrompt message={item.content} />
                </div>
              ) : item.role === "assistant" ? (
                <div key={item.id} className="flex flex-col items-start gap-2">
                  <MemoizedResponse message={item.content} />
                </div>
              ) : null,
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>
      {!isAtBottom && (
        <div
          className="absolute right-0 bottom-24 z-10 flex w-full items-center 
          justify-center rounded-full p-0"
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
