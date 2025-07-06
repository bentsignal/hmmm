"use client";

import { MemoizedPrompt } from "./prompt-message";
import { MemoizedResponse } from "./response-message";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import useMessages from "@/features/message/hooks/use-messages";
import PageLoader from "@/components/page-loader";
import {
  PAGE_SIZE,
  INVISIBLE_PAGE_LOADER_INDEX,
} from "@/features/message/config";
import { UIMessage } from "ai";

export default function Messages({ threadId }: { threadId: string }) {
  const { messages, loadMore, status } = useMessages({
    threadId,
  });

  return messages.map((item, index) =>
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
        <Message message={item} />
      </PageLoader>
    ) : (
      <Message key={item.id} message={item} />
    ),
  );
}

const Message = ({ message }: { message: UIMessage }) => {
  return message.role === "user" ? (
    <MemoizedPrompt message={message} />
  ) : message.role === "assistant" && message.parts.length > 0 ? (
    <MemoizedResponse message={message} streaming={false} />
  ) : null;
};
