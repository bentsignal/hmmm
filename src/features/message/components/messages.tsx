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

export default function Messages({ threadId }: { threadId: string }) {
  const { messages, loadMore, status } = useMessages({
    threadId,
  });

  // add invisible component 5 messages before the top of the page to fetch
  // the next page of messages. As long as the user doesn't scroll too
  // fast, they shouldn't notice pagination.
  return messages.map((item, index) =>
    index === INVISIBLE_PAGE_LOADER_INDEX ? (
      item.role === "user" ? (
        <PageLoader
          status={status}
          loadMore={() => loadMore(PAGE_SIZE)}
          singleUse={true}
          key={item.id}
        >
          <MemoizedPrompt message={item} />
        </PageLoader>
      ) : item.role === "assistant" && item.parts.length > 0 ? (
        <PageLoader
          status={status}
          loadMore={() => loadMore(PAGE_SIZE)}
          singleUse={true}
          key={item.id}
        >
          <MemoizedResponse message={item} streaming={false} />
        </PageLoader>
      ) : null
    ) : item.role === "user" ? (
      <MemoizedPrompt key={item.id} message={item} />
    ) : item.role === "assistant" && item.parts.length > 0 ? (
      <MemoizedResponse key={item.id} message={item} streaming={false} />
    ) : null,
  );
}
