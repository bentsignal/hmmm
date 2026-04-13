// eslint-disable-next-line no-restricted-imports -- useQuery needed for conditional fetching (isAuthenticated gate)
import { useQuery } from "@tanstack/react-query";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";

import { api } from "@acme/db/api";

import type {
  MyDataParts,
  MyMetadata,
  MyTools,
  MyUIMessage,
} from "../types/message-types";
import { threadQueries } from "../../lib/queries";
import { INITIAL_PAGE_SIZE } from "../config/message-config";

export function useMessages({
  threadId,
  streaming = false,
}: {
  threadId: string;
  streaming?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";

  const firstPageQuery = useQuery({
    ...threadQueries.messagesFirstPage(threadId),
    enabled: isAuthenticated,
    select: (data) => data.page,
  });

  const {
    results: messages,
    loadMore,
    isLoading,
    status,
  } = useThreadMessages(api.ai.thread.queries.getThreadMessages, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
    stream: streaming,
  });

  const shouldUseLiveResults = !isLoading && messages.length > 0;
  const activeMessages = shouldUseLiveResults
    ? messages
    : (firstPageQuery.data ?? messages);

  const rawUIMessages = toUIMessages<MyMetadata, MyDataParts, MyTools>(
    activeMessages,
  );

  const uiMessages = rawUIMessages.map((message: MyUIMessage) => {
    const nonUIMessage = activeMessages.find((m) => m._id === message.id);
    if (!nonUIMessage) {
      return message;
    }
    const attachments = nonUIMessage.attachments;
    return {
      ...message,
      metadata: {
        ...message.metadata,
        attachments: attachments,
      },
    } as const satisfies MyUIMessage;
  });

  return {
    isAuthenticated,
    messages: uiMessages,
    totalCount: activeMessages.length,
    loadMore,
    isLoading,
    status,
  };
}
