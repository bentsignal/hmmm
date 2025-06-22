"use client";

import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import useMessageListScroll from "../hooks/use-message-list-scroll";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import { memo, useEffect } from "react";
import useThread from "@/features/thread/hooks/use-thread";
import ReasoningMessage from "./reasoning-message";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import SearchResultMessage from "@/features/web-search/components/search-result-message";
import { usePageTitle } from "@/hooks/use-page-title";
import useThreadStore from "@/features/thread/store/thread-store";

const MemoizedPrompt = memo(PromptMessage);
const MemoizedResponse = memo(ResponseMessage);
const MemoizedReasoningMessage = memo(ReasoningMessage);
const MemoizedSearchResultMessage = memo(SearchResultMessage);

export default function MessageList({ threadId }: { threadId: string }) {
  const { messages, uiMessages, title } = useThread({ threadId });
  const { scrollAreaRef, messagesEndRef, isAtBottom, scrollToBottom } =
    useMessageListScroll(uiMessages.length);
  const { isThreadIdle } = useThreadStatus({ threadId });

  // set tab label in browser to thread title
  usePageTitle(title);

  // set active thread when component mounts
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  useEffect(() => {
    setActiveThread(threadId);
    return () => {
      setActiveThread(null);
    };
  }, [threadId]);

  return (
    <div className="relative h-full w-full">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="flex w-full justify-center pt-20 pb-20">
          <div className="mx-4 mb-8 flex h-full w-full max-w-4xl flex-col gap-16 px-4">
            {uiMessages.map((item, index) =>
              item.role === "user" ? (
                <div key={item.id} className="flex items-center justify-end">
                  <MemoizedPrompt message={item.content} />
                </div>
              ) : item.role === "assistant" && item.parts.length > 0 ? (
                <div key={item.id} className="flex flex-col items-start gap-2">
                  {(() => {
                    const reasoningPart = item.parts.find(
                      (part) =>
                        part.type === "reasoning" && part.reasoning.length > 0,
                    );
                    return reasoningPart &&
                      reasoningPart.type === "reasoning" ? (
                      <MemoizedReasoningMessage
                        key={`${item.id}-reasoning`}
                        message={reasoningPart.reasoning}
                        loading={!isThreadIdle}
                        mostRecent={index === uiMessages.length - 1}
                      />
                    ) : null;
                  })()}
                  {item.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MemoizedResponse
                        key={`${item.id}-${index}`}
                        message={part.text}
                        creationTime={
                          messages?.results[index]._creationTime ?? 0
                        }
                      />
                    ) : part.type === "tool-invocation" &&
                      part.toolInvocation.toolName === "search" ? (
                      <MemoizedSearchResultMessage
                        key={`${item.id}-${index}`}
                        // @ts-expect-error custom prop appended in tool call definition
                        text={part.toolInvocation.result?.text ?? ""}
                        // @ts-expect-error custom prop appended in tool call definition
                        sources={part.toolInvocation.result?.sources ?? []}
                      />
                    ) : null,
                  )}
                </div>
              ) : null,
            )}
            {uiMessages.length % 2 !== 0 && !isThreadIdle && (
              <div className="flex items-center justify-start">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
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
