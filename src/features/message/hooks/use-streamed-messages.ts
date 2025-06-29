import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";

export default function useStreamedMessage({ threadId }: { threadId: string }) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const streamingArgs = isAuthenticated ? { threadId } : "skip";
  const streamedMessages = useThreadMessages(
    api.threads.getThreadMessages,
    streamingArgs,
    {
      initialNumItems: 100,
      stream: true,
    },
  );

  const streamedMessagesCount = streamedMessages.results.length;
  const finalMessage = toUIMessages(streamedMessages.results).at(-1);

  return {
    streamedMessages,
    streamedMessagesCount,
    finalMessage,
  };
}
