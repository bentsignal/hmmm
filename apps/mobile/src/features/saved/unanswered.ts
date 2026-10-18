import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { partialMatchKey } from "@tanstack/react-query";
import { pdsSessionQueryKey } from "@decentralized-convex/tanstack-query";

import { fieldOf } from "./fields";

/**
 * The accounts whose PDS a screen gave up waiting for, until it answers
 * again. Once one screen has waited out the deadline, the next would too,
 * so their screens show what's saved as soon as they open.
 */
const unanswered = new Set<string>();

export function isUnanswered(address: string) {
  return unanswered.has(address);
}

/** Whether any account's PDS has stopped answering. */
export function anyUnanswered() {
  return unanswered.size > 0;
}

export function markUnanswered(address: string) {
  unanswered.add(address);
}

/**
 * Counts the account's PDS as answering again once one of its queries has
 * a result from a server. Saved results name no servers.
 */
function noteAnswer(
  address: string,
  query: { readonly queryKey: QueryKey; readonly state: { data: unknown } },
) {
  if (!partialMatchKey(query.queryKey, pdsSessionQueryKey(address))) return;
  const { data } = query.state;
  const status = fieldOf(data, "status");
  const sources = fieldOf(fieldOf(data, "federation"), "sources");
  if (
    (status === "success" || status === "partial") &&
    Array.isArray(sources) &&
    sources.length > 0
  ) {
    unanswered.delete(address);
  }
}

/**
 * Watches an account's queries for an answer from its PDS while it's
 * counted as not answering. Returns a function that stops.
 */
export function watchAnswers(queryClient: QueryClient, address: string) {
  const cache = queryClient.getQueryCache();
  return cache.subscribe((event) => {
    if (
      !unanswered.has(address) ||
      event.type !== "updated" ||
      event.action.type !== "success"
    ) {
      return;
    }
    const query = cache.get(event.query.queryHash);
    if (query !== undefined) noteAnswer(address, query);
  });
}
