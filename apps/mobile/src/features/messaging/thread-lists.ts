import type {
  InboxThread,
  Message,
  ThreadListing,
} from "@decentralized-convex/messages";
import type { PdsOptimisticLocalStore } from "@decentralized-convex/tanstack-query";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MAX_THREAD_UNREAD } from "@decentralized-convex/messages";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { ThreadSummaryRow } from "~/features/inbox/types";
import {
  useSearchQuery,
  useSearchText,
} from "~/features/search/use-search-query";
import { useAccount, useVisibleAccounts } from "./account";
import { conversationTitle } from "./conversations";
import { messageSummary, preview } from "./inbox";
import { useProfileState } from "./profiles";
import { pdsResultOr } from "./results";

/** A thread in a conversation, added up across its members' PDSs. */
export interface ConversationThread {
  /** Whether you're in it with its bell on. */
  readonly following: boolean;
  readonly lastReplyAt: number;
  readonly replyCount: number;
  /** Who wrote the newest replies, newest first. */
  readonly repliers: readonly string[];
  /** The message it answers; null until a PDS that has it answers. */
  readonly root: Message | null;
  readonly threadId: string;
  /** Others' replies you haven't read (none when you aren't in it). */
  readonly unreadCount: number;
}

/**
 * Each thread's listings across every PDS that stores some of its
 * replies, added up like thread summaries: a PDS can answer more than
 * once (as home and as a member's), so a listing seen twice counts once.
 * Newest reply first.
 */
function combine(listings: readonly ThreadListing[]) {
  const byThread = new Map<string, ThreadListing[]>();
  const seen = new Set<string>();
  for (const listing of listings) {
    const key = `${listing.threadId} ${listing.lastReplyAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    byThread.set(listing.threadId, [
      ...(byThread.get(listing.threadId) ?? []),
      listing,
    ]);
  }
  return [...byThread]
    .map(([threadId, found]): ConversationThread => {
      const newestFirst = [...found].sort(
        (left, right) => right.lastReplyAt - left.lastReplyAt,
      );
      return {
        following: found.some(({ following }) => following),
        lastReplyAt: newestFirst[0]?.lastReplyAt ?? 0,
        replyCount: found.reduce((total, item) => total + item.replyCount, 0),
        repliers: [...new Set(newestFirst.flatMap(({ repliers }) => repliers))],
        root: found.find(({ root }) => root !== null)?.root ?? null,
        threadId,
        unreadCount: Math.min(
          found.reduce((total, item) => total + item.unreadCount, 0),
          MAX_THREAD_UNREAD,
        ),
      };
    })
    .sort((left, right) => right.lastReplyAt - left.lastReplyAt);
}

/**
 * A conversation's threads, newest reply first: every one, or yours
 * (`mine`). `loadMore` asks for the next page. An older PDS without
 * thread lists has none.
 */
export function useConversationThreads({
  conversationId,
  mine,
  limit,
}: {
  conversationId: string;
  mine: boolean;
  /** Fewer than a page, such as the three an info page shows. */
  limit?: number;
}) {
  const { address } = useAccount();
  // `before` for each page after the first, oldest last.
  const [cursors, setCursors] = useState<readonly number[]>([]);
  const results = useQueries({
    queries: [undefined, ...cursors].map((before) =>
      pdsQuery({
        args: {
          conversationId,
          mine,
          ...(before === undefined ? {} : { before }),
          ...(limit === undefined ? {} : { limit }),
        },
        options: { select: (result) => pdsResultOr(result, []) },
        query: pds.messages.threads,
        session: address,
      }),
    ),
  });
  const threads = combine(
    results.flatMap((result) =>
      (result.data ?? []).flatMap((page) => page.threads),
    ),
  );
  const last = results.at(-1)?.data;
  const hasMore = last?.some((page) => page.hasMore) === true;
  return {
    hasMore,
    isLoading: results[0]?.data === undefined,
    /** Asks for the page after the last one loaded, if there is one. */
    loadMore: () => {
      if (last === undefined || !hasMore) return;
      const oldest = Math.min(
        ...last.flatMap((page) =>
          page.hasMore ? page.threads.map((item) => item.lastReplyAt) : [],
        ),
      );
      if (!Number.isFinite(oldest) || cursors.includes(oldest)) return;
      setCursors([...cursors, oldest]);
    },
    threads,
  };
}

/**
 * A conversation's threads matching a search of their original's and
 * replies' text, through `useSearchText`: debounced, and the last results
 * stay up while the next load. Without a search, `threads` is undefined.
 */
export function useThreadSearch({
  conversationId,
  mine,
}: {
  conversationId: string;
  mine: boolean;
}) {
  const { address } = useAccount();
  const text = useSearchText();
  const search = text.query.trim();
  const answer = useSearchQuery({
    options: pdsQuery({
      args: { conversationId, mine, search },
      options: {
        enabled: search.length > 0,
        select: (result) => {
          const pages = pdsResultOr(result, []);
          return pages === undefined
            ? undefined
            : combine(pages.flatMap((page) => page.threads));
        },
      },
      query: pds.messages.threads,
      session: address,
    }),
    query: search,
  });
  return {
    clear: text.clear,
    onChangeText: text.onChangeText,
    /** The search whose results are showing. */
    query: answer.query,
    threads: answer.query.length > 0 ? answer.data : undefined,
  };
}

/** Everyone a thread's Inbox row names. */
function peopleOf(account: string, thread: InboxThread) {
  const { kind, members, name } = thread.conversation;
  const titled =
    kind === "direct" || (kind === "group" && name === null)
      ? members.filter((member) => member !== account)
      : [];
  return [
    ...titled,
    ...(thread.root === null ? [] : [thread.root.authorId]),
    ...(thread.latest === null ? [] : [thread.latest.authorId]),
  ];
}

function summarize(
  account: string,
  thread: InboxThread,
  profileOf: ReturnType<typeof useProfileState>["profileOf"],
) {
  function displayName(address: string) {
    return profileOf(address).displayName;
  }
  const { latest, root } = thread;
  return {
    account,
    conversationId: thread.conversation.conversationId,
    conversationTitle: conversationTitle(
      thread.conversation,
      account,
      displayName,
    ),
    key: `${account} thread:${thread.threadId}`,
    lastActivityAt: new Date(thread.lastReplyAt),
    latestReply:
      latest === null
        ? ""
        : preview(latest, account, displayName(latest.authorId), true),
    replyCount: thread.replyCount,
    rootAuthor:
      root === null
        ? { avatarUrl: null, name: "Thread" }
        : {
            avatarUrl: profileOf(root.authorId).avatarUrl,
            name: displayName(root.authorId),
          },
    rootText: root === null ? "" : messageSummary(root),
    threadId: thread.threadId,
    unreadCount: thread.unreadCount,
  } satisfies ThreadSummaryRow;
}

/**
 * The threads the visible accounts follow, for the Inbox, newest reply
 * first. Only asked for while the Inbox lists threads. A row joins once
 * its names have loaded, so it never switches from usernames to names.
 */
export function useInboxThreads({ enabled }: { enabled: boolean }) {
  const accounts = useVisibleAccounts().map(({ address }) => address);
  const results = useQueries({
    queries: accounts.map((session) =>
      pdsQuery({
        args: {},
        // A server without thread lists (an older one) has none to show.
        options: { enabled, select: (result) => pdsResultOr(result, []) },
        query: pds.messages.inboxThreads,
        session,
      }),
    ),
  });
  const found = enabled
    ? results.flatMap((result, index) =>
        (result.data ?? []).map((thread) => ({
          account: accounts[index] ?? "",
          thread,
        })),
      )
    : [];
  const profiles = useProfileState(
    found.flatMap(({ account, thread }) => peopleOf(account, thread)),
  );
  return found
    .filter(({ account, thread }) =>
      peopleOf(account, thread).every(profiles.isLoaded),
    )
    .map(({ account, thread }) =>
      summarize(account, thread, profiles.profileOf),
    );
}

/**
 * Changes a thread in every loaded thread list: the Inbox's, and each
 * conversation's (`change` gets whether that list is only yours).
 */
function updateThread(
  store: PdsOptimisticLocalStore,
  threadId: string,
  change: <Item extends ThreadListing>(
    item: Item,
    mine: boolean,
  ) => Item | null,
) {
  function changed<Item extends ThreadListing>(
    items: readonly Item[],
    mine: boolean,
  ) {
    return items.flatMap((item) => {
      if (item.threadId !== threadId) return [item];
      const next = change(item, mine);
      return next === null ? [] : [next];
    });
  }
  for (const { request, value } of store.getAllQueries(
    pds.messages.inboxThreads,
  )) {
    if (value !== undefined) store.setQuery(request, changed(value, true));
  }
  for (const { args, request, value } of store.getAllQueries(
    pds.messages.threads,
  )) {
    if (value === undefined) continue;
    store.setQuery(request, {
      ...value,
      threads: changed(value.threads, args.mine === true),
    });
  }
}

/**
 * Shows a thread's bell turned on or off in loaded thread lists. Turned
 * off, it leaves the lists of your threads; turned on, it joins them with
 * the PDS's next answer.
 */
export function showThreadFollowed(
  store: PdsOptimisticLocalStore,
  args: { followed: boolean; threadId: string },
) {
  updateThread(store, args.threadId, (item, mine) => {
    if (!args.followed && mine) return null;
    return {
      ...item,
      following: args.followed,
      unreadCount: args.followed ? item.unreadCount : 0,
    };
  });
}

/** Shows a thread read in loaded thread lists, its unread dot gone. */
export function showThreadRead(
  store: PdsOptimisticLocalStore,
  args: { threadId: string },
) {
  updateThread(store, args.threadId, (item) => ({ ...item, unreadCount: 0 }));
}
