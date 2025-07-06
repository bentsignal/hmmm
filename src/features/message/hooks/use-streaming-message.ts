import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  toUIMessages,
  UIMessage,
  useThreadMessages,
} from "@convex-dev/agent/react";
import useMessages from "./use-messages";

export default function useStreamingMessage({
  threadId,
}: {
  threadId: string;
}) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const { messages } = useMessages({ threadId });
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
  let streamingMessage: UIMessage | null = null;
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

  // dedupe
  if (messages.find((message) => message.id === streamingMessage?.id)) {
    streamingMessage = null;
  }

  return {
    streamingMessage,
    messageLength: messages.length,
  };
}
