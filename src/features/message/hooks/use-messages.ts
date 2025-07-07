import {
  toUIMessages,
  UIMessage,
  useThreadMessages,
} from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { INITIAL_PAGE_SIZE } from "@/features/message/config";

export default function useMessages({ threadId }: { threadId: string }) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const {
    results: unfilteredMessages,
    loadMore,
    isLoading,
    status,
  } = useThreadMessages(api.threads.getThreadMessages, args, {
    initialNumItems: INITIAL_PAGE_SIZE,
    stream: false,
  });

  // don't include most recent message if it's a response, that
  // is shown by the streaming message component
  const uiMessages = toUIMessages(unfilteredMessages);
  let messages: UIMessage[] = [];
  if (uiMessages.length > 0) {
    const lastMessage = uiMessages[uiMessages.length - 1];
    if (lastMessage.role === "user") {
      messages = uiMessages;
    } else {
      messages = uiMessages.slice(0, -1);
    }
  }

  return {
    isAuthenticated,
    messages,
    totalCount: unfilteredMessages.length,
    loadMore,
    isLoading,
    status,
  };
}
