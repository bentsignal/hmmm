import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useThreadMessages } from "@convex-dev/agent/react";

export default function useStreamingMessages({
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

  return {
    streamedMessages,
  };
}
