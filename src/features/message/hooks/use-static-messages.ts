import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useThreadMessages } from "@convex-dev/agent/react";

// this name is somewhat misleading. these messages are not truly static, but
// the updates are not streamed in as the message loads. responses will only
// come through AFTER the the generation has been completed
export default function useStaticMessages({ threadId }: { threadId: string }) {
  // don't grab messages if the auth session data hasn't loaded yet
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const staticMessages = useThreadMessages(
    api.threads.getThreadMessages,
    args,
    {
      initialNumItems: 100,
      stream: false,
    },
  );

  // set tab label in browser to thread title
  const title = useQuery(api.threads.getThreadTitle, args);
  if (title) {
    document.title = title;
  }

  const staticMessagesCount = staticMessages.results.length;

  return {
    isAuthenticated,
    staticMessages,
    title,
    staticMessagesCount,
  };
}
