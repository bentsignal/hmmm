import { useQuery } from "@tanstack/react-query";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";

import { api } from "@acme/db/api";

import { INITIAL_PAGE_SIZE } from "~/features/messages/config";
import { threadQueries } from "~/lib/queries";
import {
  MyDataParts,
  MyMetadata,
  MyTools,
  MyUIMessage,
} from "../types/message-types";

export default function useMessages({
  threadId,
  streaming = false,
}: {
  threadId: string;
  streaming?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";

  // Phase 1: Preloaded first page from route loader cache
  const firstPageQuery = useQuery({
    ...threadQueries.messagesFirstPage(threadId),
    enabled: isAuthenticated,
    select: (data) => data.page,
  });

  // Phase 2: Live streaming query for real-time updates
  const {
    results: messages,
    loadMore,
    isLoading,
    status,
  } = useThreadMessages(api.ai.thread.getThreadMessages, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
    stream: streaming,
  });

  // Use preloaded data until live query is ready
  const shouldUseLiveResults = !isLoading && messages.length > 0;
  const activeMessages = shouldUseLiveResults
    ? messages
    : (firstPageQuery.data ?? messages);

  const rawUIMessages: MyUIMessage[] = toUIMessages<
    MyMetadata,
    MyDataParts,
    MyTools
  >(activeMessages);

  const uiMessages = rawUIMessages.map((message: MyUIMessage) => {
    const nonUIMessage = activeMessages.find((m) => m._id === message.id);
    if (!nonUIMessage) {
      return message;
    }
    const attachments = nonUIMessage.attachments;
    if (attachments) {
      return {
        ...message,
        metadata: {
          ...message.metadata,
          attachments: attachments,
        },
      } as const satisfies MyUIMessage;
    }
    return message;
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
