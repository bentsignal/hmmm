import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";

export default function useThread({ threadId }: { threadId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const messages = useThreadMessages(api.threads.getThreadMessages, args, {
    initialNumItems: 100,
    stream: true,
  });
  const uiMessages = toUIMessages(messages?.results ?? []);
  return {
    isAuthenticated,
    messages,
    uiMessages,
  };
}
