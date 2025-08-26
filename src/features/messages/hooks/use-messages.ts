import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  MyDataParts,
  MyMetadata,
  MyTools,
  MyUIMessage,
} from "../types/message-types";
import { INITIAL_PAGE_SIZE } from "@/features/messages/config";

export default function useMessages({
  threadId,
  streaming = false,
}: {
  threadId: string;
  streaming?: boolean;
}) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const {
    results: messages,
    loadMore,
    isLoading,
    status,
  } = useThreadMessages(api.ai.thread.getThreadMessages, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
    stream: streaming,
  });

  const rawUIMessages: MyUIMessage[] = toUIMessages<
    MyMetadata,
    MyDataParts,
    MyTools
  >(messages);

  const uiMessages = rawUIMessages.map((message: MyUIMessage) => {
    const nonUIMessage = messages.find((m) => m._id === message.id);
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
    totalCount: messages.length,
    loadMore,
    isLoading,
    status,
  };
}
