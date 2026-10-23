import type { Query, QueryClient } from "@tanstack/react-query";
import { partialMatchKey } from "@tanstack/react-query";
import { pdsSessionQueryKey } from "@decentralized-convex/tanstack-query";

import { fieldOf } from "~/features/saved/fields";

// Which of the cache's queries are about a conversation, and whether any
// is live (see `useStayLive`).

/** Whether a query is one of the session's about the conversation. */
export function isAbout(query: Query, session: string, conversationId: string) {
  const request = query.queryKey[5];
  const args = fieldOf(fieldOf(request, "operation"), "args");
  return (
    partialMatchKey(query.queryKey, pdsSessionQueryKey(session)) &&
    fieldOf(args, "conversationId") === conversationId
  );
}

/**
 * Whether anything about the conversation is live: its screen is open, or
 * it's staying live after closing.
 */
export function isLive(
  queryClient: QueryClient,
  session: string,
  conversationId: string,
) {
  return queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => query.isActive() })
    .some((query) => isAbout(query, session, conversationId));
}
