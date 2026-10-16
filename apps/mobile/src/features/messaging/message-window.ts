import type { Message as PdsMessage } from "@decentralized-convex/messages";
import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { pdsResult } from "./results";

type PageCursor =
  | { readonly after: number }
  | { readonly around: string }
  | { readonly before: number };

interface View {
  /** The message the window opened on, or undefined for the latest. */
  readonly anchor: string | undefined;
  /**
   * The page the window opened with. Loading more never changes it, so the
   * list only remounts when the window reopens.
   */
  readonly opened: PageCursor;
  /** Oldest page first. */
  readonly pages: readonly PageCursor[];
  /** The pages it opened with, which must load before anything shows. */
  readonly initial: readonly PageCursor[];
}

/** A page cursor's identity, stable across renders. */
function pageKey(cursor: PageCursor) {
  return JSON.stringify(cursor);
}

/**
 * When each conversation's latest window opened this app session. Reusing
 * it keeps query keys stable, so reopening a conversation shows cached
 * messages immediately instead of fetching from scratch.
 */
const openedAtByConversation = new Map<string, number>();
/** Past this, so many messages may have arrived that a fresh window is better. */
const REUSE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Pages for the latest messages. The first page is frozen at the moment the
 * conversation opened, and a live tail page collects everything after it,
 * so new messages never shift the older pages.
 */
function latestWindow(windowKey: string, reopen = false) {
  const previous = openedAtByConversation.get(windowKey);
  const openedAt =
    !reopen && previous !== undefined && Date.now() - previous < REUSE_WINDOW_MS
      ? previous
      : Date.now();
  openedAtByConversation.set(windowKey, openedAt);
  const opened = { before: openedAt + 1 };
  const pages = [opened, { after: openedAt }];
  return { anchor: undefined, initial: pages, opened, pages } satisfies View;
}

function anchoredWindow(messageId: string) {
  const opened = { around: messageId };
  return {
    anchor: messageId,
    initial: [opened],
    opened,
    pages: [opened],
  } satisfies View;
}

/** Combines what every PDS returned for one page cursor. */
function mergeSources(
  sources: readonly {
    hasNewer: boolean;
    hasOlder: boolean;
    messages: PdsMessage[];
  }[],
) {
  return {
    hasNewer: sources.some((source) => source.hasNewer),
    hasOlder: sources.some((source) => source.hasOlder),
    messages: sources.flatMap((source) => source.messages),
  };
}

/** Every loaded message once, oldest first. */
function mergePages(pages: readonly { data?: { messages: PdsMessage[] } }[]) {
  const byId = new Map(
    pages
      .flatMap((page) => page.data?.messages ?? [])
      .map((message) => [message.messageId, message] as const),
  );
  return [...byId.values()].sort(
    (left, right) =>
      left.sentAt - right.sentAt ||
      left.messageId.localeCompare(right.messageId),
  );
}

function pageQuery(
  session: string,
  conversationId: string,
  cursor: PageCursor,
) {
  return pdsQuery({
    args: { conversationId, ...cursor },
    options: {
      select: (result) => {
        const sources = pdsResult(result);
        return sources === undefined ? undefined : mergeSources(sources);
      },
    },
    query: pds.messages.list,
    session,
  });
}

/**
 * Starts loading the pages a conversation opens with at its latest
 * message, ahead of the window that will show them.
 */
export function prefetchLatestMessages(
  queryClient: QueryClient,
  session: string,
  conversationId: string,
) {
  for (const cursor of latestWindow(`${session} ${conversationId}`).pages) {
    void queryClient.prefetchQuery(pageQuery(session, conversationId, cursor));
  }
}

/**
 * A scrollable window over a conversation, oldest first, that can open at
 * the latest message or around a specific one and grow in either direction.
 */
export function useMessageWindow(
  session: string,
  conversationId: string,
  anchor?: string,
) {
  const windowKey = `${session} ${conversationId}`;
  const [view, setView] = useState<View>(() =>
    anchor === undefined ? latestWindow(windowKey) : anchoredWindow(anchor),
  );
  const pages = useQueries({
    queries: view.pages.map((cursor) =>
      pageQuery(session, conversationId, cursor),
    ),
  });

  const messages = mergePages(pages);
  const initial = new Set(view.initial);
  const first = pages[0]?.data;
  const last = pages.at(-1)?.data;
  const hasOlder = first?.hasOlder ?? false;
  const hasNewer = last?.hasNewer ?? false;

  /**
   * Adds a page unless the window already has it: the list can ask twice
   * before the first request lands.
   */
  function addPage(cursor: PageCursor, at: "end" | "start") {
    const key = pageKey(cursor);
    setView((current) => {
      if (current.pages.some((page) => pageKey(page) === key)) return current;
      return {
        ...current,
        pages:
          at === "start"
            ? [cursor, ...current.pages]
            : [...current.pages, cursor],
      };
    });
  }

  function loadOlder() {
    const oldest = messages[0];
    if (!hasOlder || oldest === undefined) return;
    addPage({ before: oldest.sentAt }, "start");
  }

  function loadNewer() {
    const newest = messages.at(-1);
    if (!hasNewer || newest === undefined) return;
    addPage({ after: newest.sentAt }, "end");
  }

  return {
    anchor: view.anchor,
    /** Each loaded page's message IDs, for per-page reaction queries. */
    pageMessageIds: pages.map(
      (page) => page.data?.messages.map((message) => message.messageId) ?? [],
    ),
    /**
     * Each page by key, oldest first, with its message IDs once it has
     * loaded, and whether it is one the window opened with.
     */
    pages: view.pages.map((cursor, index) => ({
      initial: initial.has(cursor),
      key: pageKey(cursor),
      messageIds: pages[index]?.data?.messages.map(
        (message) => message.messageId,
      ),
    })),
    /** Changes whenever the window reopens, so lists can remount. */
    viewKey: pageKey(view.opened),
    hasNewer,
    hasOlder,
    /** Drops the loaded pages and reopens at the latest message. */
    jumpToLatest: () => setView(latestWindow(windowKey, true)),
    loadNewer,
    loadOlder,
    messages,
  };
}
