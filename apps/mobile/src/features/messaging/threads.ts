import type {
  ThreadState,
  ThreadSummary,
} from "@decentralized-convex/messages";
import type { PdsOptimisticLocalStore } from "@decentralized-convex/tanstack-query";
import { useEffect, useRef } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { MAX_REACTION_MESSAGES } from "@decentralized-convex/messages";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { ThreadInfo } from "~/features/conversation/types";
import { useAccount } from "./account";
import { pdsResult, pdsResultOr } from "./results";

/** No IDs, the same array each time. */
const NONE = Object.freeze<string[]>([]);

function chunks(ids: readonly string[]) {
  return Array.from(
    { length: Math.ceil(ids.length / MAX_REACTION_MESSAGES) },
    (_, index) =>
      ids.slice(
        index * MAX_REACTION_MESSAGES,
        (index + 1) * MAX_REACTION_MESSAGES,
      ),
  );
}

/**
 * Each thread's replies across every PDS that stores some: their counts
 * added up, and the people who wrote the newest ones first.
 */
function combine(summaries: readonly ThreadSummary[]) {
  const byThread = new Map<string, ThreadSummary[]>();
  for (const summary of summaries) {
    byThread.set(summary.threadId, [
      ...(byThread.get(summary.threadId) ?? []),
      summary,
    ]);
  }
  return new Map(
    [...byThread].map(([threadId, found]): [string, ThreadInfo] => {
      const newestFirst = [...found].sort(
        (left, right) => right.lastReplyAt - left.lastReplyAt,
      );
      return [
        threadId,
        {
          repliers: [
            ...new Set(newestFirst.flatMap(({ repliers }) => repliers)),
          ],
          replyCount: found.reduce(
            (total, { replyCount }) => total + replyCount,
            0,
          ),
        },
      ];
    }),
  );
}

/**
 * How many replies the loaded messages' threads have, one query per page
 * like reactions. `threadOf` is undefined for a message without replies,
 * and `isLoaded` says whether that's known yet.
 */
export function useThreadSummaries(
  session: string,
  conversationId: string,
  pageThreadIds: readonly (readonly string[])[],
) {
  const batches = pageThreadIds.flatMap(chunks);
  const { loaded, threads } = useQueries({
    queries: batches.map((messageIds) =>
      pdsQuery({
        args: { conversationId, messageIds },
        options: {
          enabled: messageIds.length > 0,
          // A PDS that can't answer (an older one) has no threads.
          select: (result) => pdsResultOr(result, [])?.flat(),
        },
        query: pds.messages.threadSummaries,
        session,
      }),
    ),
    combine: (results) => ({
      loaded: batches.flatMap((messageIds, index) =>
        results[index]?.data === undefined ? NONE : messageIds,
      ),
      threads: Object.fromEntries(
        combine(results.flatMap((result) => result.data ?? [])),
      ),
    }),
  });
  const loadedIds = new Set(loaded);
  return {
    isLoaded: (threadId: string) => loadedIds.has(threadId),
    threadOf: (threadId: string): ThreadInfo | undefined => threads[threadId],
  };
}

/** Shows a thread's bell as turned on or off. */
function showFollowed(
  store: PdsOptimisticLocalStore,
  args: { conversationId: string; followed: boolean; threadId: string },
) {
  const request = pds.messages.threadState({
    conversationId: args.conversationId,
    threadId: args.threadId,
  });
  const state = store.getQuery(request);
  store.setQuery(request, {
    lastReadAt: state?.lastReadAt ?? null,
    following: args.followed,
  } satisfies ThreadState);
}

/**
 * Your place in a thread (whether its bell is on) and a toggle that shows
 * right away.
 */
export function useThreadState(conversationId: string, threadId: string) {
  const { address } = useAccount();
  const { data } = useQuery(
    pdsQuery({
      args: { conversationId, threadId },
      options: { select: (result) => pdsResult(result)?.[0] },
      query: pds.messages.threadState,
      session: address,
    }),
  );
  const { mutate } = useMutation(
    pdsMutation({
      mutation: pds.messages.setThreadFollowed,
      optimisticUpdate: showFollowed,
      session: address,
    }),
  );
  return {
    /** Undefined until it has loaded. */
    following: data?.following,
    setFollowed: (followed: boolean, onError: () => void) =>
      mutate({ conversationId, followed, threadId }, { onError }),
  };
}

/** Marks the thread read up to its newest reply while it is open. */
export function useMarkThreadRead(
  conversationId: string,
  threadId: string,
  newestSentAt?: number,
) {
  const { address } = useAccount();
  const { mutate } = useMutation(
    pdsMutation({ mutation: pds.messages.markThreadRead, session: address }),
  );
  const lastMarked = useRef(0);
  // eslint-disable-next-line no-restricted-syntax -- Read state lives on the server and must follow replies arriving while the thread is open.
  useEffect(() => {
    if (newestSentAt === undefined || newestSentAt <= lastMarked.current) {
      return;
    }
    lastMarked.current = newestSentAt;
    mutate({ conversationId, readAt: newestSentAt, threadId });
  }, [conversationId, mutate, newestSentAt, threadId]);
}
