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
    messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <>
      <div className="flex flex-col gap-16">
        {messages.map((item, index) =>
          index === INVISIBLE_PAGE_LOADER_INDEX ? (
            // add invisible component 5 messages before the top of the page to fetch
            // the next page of messages. As long as the user doesn't scroll too
            // fast, they shouldn't notice pagination.
            <PageLoader
              status={status}
              loadMore={() => loadMore(PAGE_SIZE)}
              singleUse={true}
              key={item.id}
            >
              <Message
                message={item}
                isActive={index === messages.length - 1 && !isThreadIdle}
              />
            </PageLoader>
          ) : (
            <Message
              key={item.id}
              message={item}
              isActive={index === messages.length - 1 && !isThreadIdle}
            />
          ),
        )}
        {waiting && (
          <div className="flex justify-start items-start">
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
}: {
  message: UIMessage;
  isActive: boolean;
}) => {
  return (
    <div className="w-full max-w-full">
      {message.role === "user" ? (
        <PromptMessage message={message} />
      ) : message.role === "assistant" && message.parts.length > 0 ? (
        <ResponseMessage message={message} isActive={isActive} />
      ) : null}
    </div>
  );
};

const Message = memo(PureMessage, (prev, next) => {
  return prev.isActive === next.isActive && equal(prev.message, next.message);
});
