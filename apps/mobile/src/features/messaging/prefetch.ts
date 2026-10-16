import { useQueryClient } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { prefetchLatestMessages } from "./message-window";

/**
 * Starts loading a conversation the moment its row is tapped, so its
 * messages are often there by the time the screen is.
 */
export function usePrefetchConversation() {
  const queryClient = useQueryClient();
  return (session: string, conversationId: string) => {
    void queryClient.prefetchQuery(
      pdsQuery({
        args: { conversationId },
        query: pds.messages.conversation,
        session,
      }),
    );
    prefetchLatestMessages(queryClient, session, conversationId);
  };
}
