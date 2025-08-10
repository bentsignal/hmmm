"use client";

import { memo, useEffect } from "react";
import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";
import { UIMessage } from "@convex-dev/agent/react";
import equal from "fast-deep-equal";
import ThreadFollowUps from "../thread/components/thread-follow-ups";
import useThreadStatus from "../thread/hooks/use-thread-status";
import PromptMessage from "./components/prompt-message";
import ResponseMessage from "./components/response-message";
import useMessages from "./hooks/use-messages";
import PageLoader from "@/components/page-loader";
import { Loader } from "@/components/ui/loader";
import {
  INVISIBLE_PAGE_LOADER_INDEX,
  PAGE_SIZE,
} from "@/features/messages/config";

export default function Messages({
  threadId,
  triggerMessagesLoaded,
}: {
  threadId: string;
  triggerMessagesLoaded: () => void;
}) {
  const { messages, loadMore, status } = useMessages({
    threadId,
    streaming: true,
  });

  // thread is not idle if waiting for a response, or if a response is streaming in
  const { isThreadIdle } = useThreadStatus({ threadId });

  // when messages have loaded, tell parent component to scroll to the bottom of the page
  useEffect(() => {
    if (messages.length > 0) {
      triggerMessagesLoaded();
    }
  }, [messages.length, triggerMessagesLoaded]);

  // show a loading spinner when the user has sent a prompt and is waiting for a response
  const waiting =
    messages.length > 0 && messages[messages.length - 1].role !== "assistant";

  return (
    <>
      <div className="flex flex-col gap-16">
        {messages
          .filter((item) => item.role !== "system")
          .map((item, index) => {
            // message id can change while a message is streaming, so we need a stable
            // key to prevent the message from re-rendering.
            const isLast = index === messages.length - 1;
            const isStreaming = isLast && !isThreadIdle;
            const stableKey = isStreaming ? "last-streaming-message" : item.id;
            // add invisible wrapper 5th message down from the top of the page. When this
            // message comes into view, the next page of messages will be fetched.
            if (index === INVISIBLE_PAGE_LOADER_INDEX) {
              return (
                <PageLoader
                  status={status}
                  loadMore={() => loadMore(PAGE_SIZE)}
                  singleUse={true}
                  key={stableKey}
                >
                  <Message
                    threadId={threadId}
                    message={item}
                    isActive={index === messages.length - 1 && !isThreadIdle}
                  />
                </PageLoader>
              );
            }
            return (
              <Message
                key={stableKey}
                threadId={threadId}
                message={item}
                isActive={isStreaming}
              />
            );
          })}
        {waiting && (
          <div className="flex items-start justify-start">
            <Loader variant="typing" size="md" />
          </div>
        )}
      </div>
      {!waiting && <ThreadFollowUps threadId={threadId} />}
    </>
  );
}

const PureMessage = ({
  message,
  isActive,
  threadId,
}: {
  message: UIMessage;
  isActive: boolean;
  threadId: string;
}) => {
  return (
    <div className="w-full max-w-full">
      {message.role === "user" ? (
        <PromptMessage message={message} />
      ) : message.role === "assistant" && message.parts.length > 0 ? (
        <ResponseMessage
          threadId={threadId}
          message={message}
          isActive={isActive}
        />
      ) : null}
    </div>
  );
};

const Message = memo(PureMessage, (prev, next) => {
  return prev.isActive === next.isActive && equal(prev.message, next.message);
});
