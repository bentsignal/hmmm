"use client";

import Message from "./components/message";
import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";
import { UIMessage } from "@convex-dev/agent/react";
import PageLoader from "@/components/page-loader";
import {
  INVISIBLE_PAGE_LOADER_INDEX,
  PAGE_SIZE,
} from "@/features/messages/config";

export default function Messages({
  messages,
  loadMore,
  loadingStatus,
  isIdle,
}: {
  messages: UIMessage[];
  loadMore: (numItems: number) => void;
  loadingStatus:
    | "LoadingFirstPage"
    | "CanLoadMore"
    | "LoadingMore"
    | "Exhausted";
  isIdle: boolean;
}) {
  return messages.map((item, index) =>
    index === INVISIBLE_PAGE_LOADER_INDEX ? (
      // add invisible component 5 messages before the top of the page to fetch
      // the next page of messages. As long as the user doesn't scroll too
      // fast, they shouldn't notice pagination.
      <PageLoader
        status={loadingStatus}
        loadMore={() => loadMore(PAGE_SIZE)}
        singleUse={true}
        key={item.id}
      >
        <Message
          message={item}
          isActive={index === messages.length - 1 && !isIdle}
        />
      </PageLoader>
    ) : (
      <Message
        key={item.id}
        message={item}
        isActive={index === messages.length - 1 && !isIdle}
      />
    ),
  );
}
