import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useThreadMessages } from "@convex-dev/agent/react";

export default function useNonStreamingMessages({
  threadId,
}: {
  threadId: string;
}) {
  // don't get messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const messages = useThreadMessages(api.threads.getThreadMessages, args, {
    initialNumItems: 100,
    stream: false,
  });

  return {
    isAuthenticated,
    messages,
  };
}
