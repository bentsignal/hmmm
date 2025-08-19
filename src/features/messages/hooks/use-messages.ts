import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
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

  const uiMessages = toUIMessages(messages);

  return {
    isAuthenticated,
    messages: uiMessages,
    totalCount: messages.length,
    loadMore,
    isLoading,
    status,
  };
}
