import { useState } from "react";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { UIMessage } from "ai";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import useMessageStore from "../store/message-store";

export default function useStreamingMessages({
  threadId,
  messages,
}: {
  threadId: string;
  messages: UIMessage[];
}) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const { results } = useThreadMessages(
    api.thread.thread_queries.getThreadMessages,
    args,
    {
      initialNumItems: 1,
      stream: true,
    },
  );

  // determine if new messages have been sent since thread has been loaded
  // this is used to move new messages sent to the top of the screen
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);
  const [initialLength] = useState(() => numMessagesSent);
  const hasNewMessages = numMessagesSent != initialLength;

  // dedupe
  const uiMessages = toUIMessages(results);
  const streamingMessages = uiMessages.filter(
    (msg) => !messages.some((m) => m.id === msg.id),
  );

  // when the user submits a prompt, show a loading spinner while waiting for a response
  const waiting =
    uiMessages.length > 0 && uiMessages[uiMessages.length - 1].role === "user";

  return {
    streamingMessages,
    messageLength: messages.length,
    waiting,
    hasNewMessages,
  };
}
