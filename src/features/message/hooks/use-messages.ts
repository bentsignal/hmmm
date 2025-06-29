import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  toUIMessages,
  UIMessage,
  useThreadMessages,
} from "@convex-dev/agent/react";

export default function useMessages({ threadId }: { threadId: string }) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const unfilteredMessages = useThreadMessages(
    api.threads.getThreadMessages,
    args,
    {
      initialNumItems: 100,
      stream: false,
    },
  );

  // don't include most recent message if it's a response, that
  // is shown by the streaming message component
  const uiMessages = toUIMessages(unfilteredMessages.results);
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
  };
}
