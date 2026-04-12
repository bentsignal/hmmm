// eslint-disable-next-line no-restricted-imports -- manual memo needed: deep-equal check prevents message re-renders during streaming
import { memo, useEffect } from "react";

import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";

import equal from "fast-deep-equal";

import { Loader } from "@acme/ui/loader";

import type { MyUIMessage } from "./types/message-types";
import PageLoader from "~/components/page-loader";
import {
  INVISIBLE_PAGE_LOADER_INDEX,
  PAGE_SIZE,
} from "~/features/messages/config";
import ThreadFollowUps from "../thread/components/thread-follow-ups";
import PromptMessage from "./components/prompt-message";
import ResponseMessage from "./components/response-message";
import useMessages from "./hooks/use-messages";
import { responseHasNoContent } from "./util/message-util";

export default function Messages({
  threadId,
  triggerMessagesLoaded,
  isThreadIdle,
}: {
  threadId: string;
  triggerMessagesLoaded: () => void;
  isThreadIdle: boolean;
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

  // eslint-disable-next-line no-restricted-syntax -- effect needed to notify parent to scroll after messages load (DOM sync)
  useEffect(() => {
    if (messages.length > 0) {
      triggerMessagesLoaded();
    }
  }, [messages.length, triggerMessagesLoaded]);

  // show a loading spinner when the user has sent a prompt and is waiting for a response
  const lastMessage = messages[messages.length - 1];
  const waiting =
    messages.length > 0 &&
    lastMessage !== undefined &&
    (lastMessage.role === "user" || responseHasNoContent(lastMessage));

  return (
    <>
      <div className="flex flex-col gap-16">
        {messages.map((item, index) => {
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
  message: MyUIMessage;
  isActive: boolean;
  threadId: string;
}) => {
  if (message.role === "assistant" && responseHasNoContent(message)) {
    return null;
  }

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
