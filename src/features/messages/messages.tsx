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
  status,
}: {
  messages: UIMessage[];
  loadMore: (numItems: number) => void;
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
}) {
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
        <Message message={item} streaming={false} />
      </PageLoader>
    ) : (
      <Message key={item.id} message={item} streaming={false} />
    ),
  );
}
