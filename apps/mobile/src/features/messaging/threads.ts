import type {
  ThreadState,
  ThreadSummary,
} from "@decentralized-convex/messages";
import type { PdsOptimisticLocalStore } from "@decentralized-convex/tanstack-query";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
// eslint-disable-next-line no-restricted-imports -- Expo Router has no route loaders to preload suspense queries.
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { ThreadInfo } from "~/features/conversation/types";
import { selectionTick } from "~/lib/native-extras";
import { useAccount } from "./account";
import { useHeldBatches } from "./held-batches";
import { chunks } from "./reactions";
import { pdsResult, pdsResultOr } from "./results";
import { showThreadFollowed, showThreadRead } from "./thread-lists";

/** No IDs, the same array each time. */
const NONE = Object.freeze<string[]>([]);

/**
 * Each thread's replies across every PDS that stores some: their counts
 * added up, and the people who wrote the newest ones first. A PDS can
 * answer more than once (as home and as a member's), so a summary seen
 * twice counts once.
 */
function combine(summaries: readonly ThreadSummary[]) {
  const byThread = new Map<string, ThreadSummary[]>();
  const seen = new Set<string>();
  for (const summary of summaries) {
    const key = `${summary.threadId} ${summary.lastReplyAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
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

/** The summaries of one batch of a page's threads. */
export function summariesQuery(
  session: string,
  conversationId: string,
  messageIds: readonly string[],
) {
  return pdsQuery({
    args: { conversationId, messageIds: [...messageIds] },
    options: {
      enabled: messageIds.length > 0,
      // A PDS that can't answer (an older one) has no threads.
      select: (result) => pdsResultOr(result, [])?.flat(),
    },
    query: pds.messages.threadSummaries,
    session,
  });
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
  const held = useHeldBatches();
  function summaries(messageIds: readonly string[]) {
    return summariesQuery(session, conversationId, messageIds);
  }
  const { loaded, ownLoaded, threads } = useQueries({
    queries: batches.map(summaries),
    combine: (results) => {
      const answers = batches.map((messageIds, index) =>
        held.answer(messageIds, results[index]?.data, summaries),
      );
      return {
        loaded: batches.flatMap((messageIds, index) =>
          answers[index] === undefined ? NONE : messageIds,
        ),
        ownLoaded: batches.filter(
          (_, index) => results[index]?.data !== undefined,
        ),
        threads: combine(answers.flatMap((answer) => answer ?? [])),
      };
    },
  });
  held.remember(ownLoaded);
  const loadedIds = new Set(loaded);
  return {
    isLoaded: (threadId: string) => loadedIds.has(threadId),
    threadOf: (threadId: string) => threads.get(threadId),
  };
}

/** Shows a thread's bell as turned on or off, here and in thread lists. */
function showFollowed(
  store: PdsOptimisticLocalStore,
  args: { conversationId: string; followed: boolean; threadId: string },
) {
  showThreadFollowed(store, args);
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
  const following = data?.following;
  return {
    /** Undefined until it has loaded. */
    following,
    /** Turns the bell off or back on, showing it right away. */
    toggle: () => {
      if (following === undefined) return;
      selectionTick();
      mutate(
        { conversationId, followed: !following, threadId },
        {
          onError: () =>
            Alert.alert(
              "Couldn't Change Notifications",
              "Try again in a moment.",
            ),
        },
      );
    },
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
    pdsMutation({
      mutation: pds.messages.markThreadRead,
      optimisticUpdate: showThreadRead,
      session: address,
    }),
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
