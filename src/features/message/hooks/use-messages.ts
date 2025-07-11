import { useState } from "react";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import useMessageStore from "../store";
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
  } = useThreadMessages(api.threads.getThreadMessages, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
    stream: false,
  });

  const uiMessages = toUIMessages(messages);

  // determine if new messages have been sent since thread has been loaded
  // this is used to move new messages sent to the top of the screen
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);
  const [initialLength] = useState(() => numMessagesSent);
  const hasNewMessages = numMessagesSent != initialLength;

  return {
    isAuthenticated,
    messages: uiMessages,
    totalCount: messages.length,
    hasNewMessages,
    loadMore,
    isLoading,
    status,
  };
}
