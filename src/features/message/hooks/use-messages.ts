import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { INITIAL_PAGE_SIZE } from "@/features/message/config";

export default function useMessages({ threadId }: { threadId: string }) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const {
    results: messages,
    loadMore,
    isLoading,
    status,
  } = useThreadMessages(api.thread.thread_queries.getThreadMessages, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
    stream: false,
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
