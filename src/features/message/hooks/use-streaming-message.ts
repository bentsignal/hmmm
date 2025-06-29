import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";

export default function useStreamingMessage({
  threadId,
}: {
  threadId: string;
}) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const streamedMessages = useThreadMessages(
    api.threads.getThreadMessages,
    args,
    {
      initialNumItems: 1,
      stream: true,
    },
  );

  // grab latest response message if present
  const uiMessages = toUIMessages(streamedMessages.results);
  let streamingMessage = null;
  if (uiMessages.length === 1 && uiMessages[0].role === "assistant") {
    streamingMessage = uiMessages[0];
  }
  if (
    uiMessages.length === 2 &&
    uiMessages[0].role === "user" &&
    uiMessages[1].role === "assistant"
  ) {
    streamingMessage = uiMessages[1];
  }

  return {
    streamingMessage,
  };
}
