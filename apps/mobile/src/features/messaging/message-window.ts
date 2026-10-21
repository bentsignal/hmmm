import type { PageCursor, PageData, View } from "./window-model";
import type { Message as PdsMessage } from "@decentralized-convex/messages";
import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { cachedSelected, pdsResult } from "./results";
import { isLive } from "./stay-live";
import {
  advance,
  anchoredView,
  latestView,
  mergePages,
  pageAfter,
  pageKey,
  reusable,
  withPage,
  windowParts,
} from "./window-model";

// The pages a screen shows of a conversation or a thread, and how they
// follow new messages: see window-model.ts.

/** The window each conversation last showed this app session, and when. */
const lastWindows = new Map<string, { view: View; at: number }>();
/**
 * Past this, so many messages may have arrived that a fresh window is
 * better. A window still live (see `stayLive`) is current anyway; one that
 * isn't shows what it last had while the PDS catches it up, and opens again
 * at the latest if it turns out to be more than a page behind.
 */
const REUSE_WINDOW_MS = 10 * 60 * 1000;

/** What a window pages through: a conversation, or one thread in it. */
export interface WindowSource {
  readonly conversationId: string;
  /** The thread's original message, for a thread's replies. */
  readonly threadId?: string;
}

type Page = PageData<PdsMessage> & { root?: PdsMessage | null };

/**
 * Combines what every PDS returned for one page cursor. A thread's page
 * also has its original, from whichever PDS stores it.
 */
function mergeSources(
  sources: readonly {
    hasNewer: boolean;
    hasOlder: boolean;
    messages: PdsMessage[];
    root?: PdsMessage | null;
  }[],
): Page {
  return {
    hasNewer: sources.some((source) => source.hasNewer),
    hasOlder: sources.some((source) => source.hasOlder),
    messages: sources.flatMap((source) => source.messages),
    root: sources.find((source) => source.root != null)?.root ?? null,
  };
}

function listPageQuery(
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

function threadPageQuery(
  session: string,
  { conversationId, threadId }: Required<WindowSource>,
  cursor: PageCursor,
) {
  return pdsQuery({
    // A thread always opens at its latest replies.
    args: { conversationId, threadId, ...("around" in cursor ? {} : cursor) },
    options: {
      select: (result) => {
        const sources = pdsResult(result);
        return sources === undefined ? undefined : mergeSources(sources);
      },
    },
    query: pds.messages.thread,
    session,
  });
}

function pageQuery(session: string, source: WindowSource, cursor: PageCursor) {
  const { conversationId, threadId } = source;
  return threadId === undefined
    ? listPageQuery(session, conversationId, cursor)
    : threadPageQuery(session, { conversationId, threadId }, cursor);
}

function windowKeyOf(session: string, source: WindowSource) {
  return [session, source.conversationId, source.threadId ?? ""].join(" ");
}

/** What's cached of a page. */
function cachedPage(
  queryClient: QueryClient,
  session: string,
  { conversationId, threadId }: WindowSource,
  cursor: PageCursor,
) {
  return threadId === undefined
    ? cachedSelected(queryClient, listPageQuery(session, conversationId, cursor))
    : cachedSelected(
        queryClient,
        threadPageQuery(session, { conversationId, threadId }, cursor),
      );
}

/** The view a window over the latest messages opens with, remembered. */
function openLatest(
  queryClient: QueryClient,
  session: string,
  source: WindowSource,
  now = Date.now(),
) {
  const windowKey = windowKeyOf(session, source);
  const last = lastWindows.get(windowKey);
  const lastCursor = last?.view.pages.at(-1);
  const lastPage =
    lastCursor === undefined
      ? undefined
      : cachedPage(queryClient, session, source, lastCursor);
  if (
    last !== undefined &&
    reusable(last.view, lastPage, {
      age: now - last.at,
      maxAge: REUSE_WINDOW_MS,
    })
  ) {
    // Followed again only once the PDS confirms its pages (`advance`).
    return isLive(queryClient, session, source.conversationId)
      ? last.view
      : { ...last.view, followed: [] };
  }
  const view = latestView(now);
  lastWindows.set(windowKey, { at: now, view });
  return view;
}

/**
 * Remembers the window a screen shows, to open with it again, and when it
 * opened at the latest messages.
 */
function remember(windowKey: string, view: View) {
  const last = lastWindows.get(windowKey);
  if (last?.view === view || view.anchor !== undefined) return;
  const same = last !== undefined && last.view.liveSince === view.liveSince;
  lastWindows.set(windowKey, { at: same ? last.at : Date.now(), view });
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
  const source = { conversationId };
  for (const cursor of openLatest(queryClient, session, source).pages) {
    void queryClient.prefetchQuery(
      listPageQuery(session, conversationId, cursor),
    );
  }
}

/**
 * Fetches a conversation's latest messages again, as a window opened at
 * them now would show them (with what they show, which comes along), even
 * if they're cached: a copy saved on the device is behind.
 */
export function refetchLatestMessages(
  queryClient: QueryClient,
  session: string,
  conversationId: string,
) {
  const source = { conversationId };
  return Promise.all(
    openLatest(queryClient, session, source).pages.map((cursor) =>
      queryClient.fetchQuery({
        ...listPageQuery(session, conversationId, cursor),
        staleTime: 0,
      }),
    ),
  );
}

/**
 * When the conversation's latest window opened this app session, if it
 * has: its pages are the latest messages a screen has shown.
 */
export function latestOpenedAt(session: string, conversationId: string) {
  return lastWindows.get(windowKeyOf(session, { conversationId }))?.view
    .liveSince;
}

/** The pages of the conversation's latest window opened at `openedAt`. */
export function latestPageQueries(
  session: string,
  conversationId: string,
  openedAt: number,
) {
  return latestView(openedAt).pages.map((cursor) =>
    listPageQuery(session, conversationId, cursor),
  );
}

/** The queries the pages of a window opened at `openedAt` show with. */
export function latestPageParts(
  openedAt: number,
  pages: readonly PageData[],
) {
  return windowParts(latestView(openedAt), pages);
}

/** The window's pages, as the list and its reactions and threads use them. */
function pagesOf(
  view: View,
  results: readonly { data?: Page }[],
  offset = 0,
) {
  const initial = new Set(view.initial);
  return view.pages.map((cursor, index) => ({
    initial: initial.has(cursor),
    key: pageKey(cursor),
    data: results[offset + index]?.data,
  }));
}

/**
 * A scrollable window over a conversation (or a thread's replies), oldest
 * first, that can open at the latest message or around a specific one and
 * grow in either direction. At the latest messages it follows new ones as
 * they arrive (see window-model.ts).
 */
export function useMessageWindow(
  session: string,
  source: WindowSource,
  anchor?: string,
) {
  const queryClient = useQueryClient();
  const windowKey = windowKeyOf(session, source);
  const [openedAt] = useState(Date.now);
  // What's in the cache from before is current if the conversation was
  // still live; otherwise only what the PDS has sent since opening is.
  const [liveBefore] = useState(() =>
    isLive(queryClient, session, source.conversationId),
  );
  const [state, setState] = useState<{ view: View; next?: View }>(() => ({
    view:
      anchor === undefined || source.threadId !== undefined
        ? openLatest(queryClient, session, source, openedAt)
        : anchoredView(anchor),
  }));
  const { view, next } = state;
  remember(windowKey, view);
  const results = useQueries({
    queries: [...view.pages, ...(next?.pages ?? [])].map((cursor) =>
      pageQuery(session, source, cursor),
    ),
  });
  const resultsOf = (shown: View, offset: number) =>
    shown.pages.map((_, index) => {
      const result = results[offset + index];
      return result?.data === undefined
        ? undefined
        : {
            data: result.data,
            fresh: liveBefore || result.dataUpdatedAt >= openedAt,
          };
    });

  // Follows new messages, and opens again at the latest when far behind,
  // keeping what's shown until the new window has loaded.
  const step = advance(view, resultsOf(view, 0));
  const nextStep =
    next === undefined
      ? undefined
      : advance(next, resultsOf(next, view.pages.length));
  const followed = step === undefined || step === "behind" ? view : step.view;
  const opening =
    nextStep !== undefined && nextStep !== "behind"
      ? nextStep.view
      : (next ?? (step === "behind" ? latestView(Date.now()) : undefined));
  if (followed !== view || opening !== next) {
    setState({ next: opening, view: followed });
  }

  const pages = results.slice(0, view.pages.length);
  const messages = mergePages(pages.map((page) => page.data));
  const first = pages[0]?.data;
  const last = pages.at(-1)?.data;
  const live = view.liveSince !== undefined;

  function addPage(cursor: PageCursor, at: "end" | "start") {
    setState((current) => ({
      ...current,
      view: withPage(current.view, cursor, at),
    }));
  }

  return {
    anchor: view.anchor,
    /** Which queries the loaded pages' reactions and threads come from. */
    parts: windowParts(
      view,
      pages.map((page) => page.data),
    ),
    /** A thread's original message, once a page has it. */
    root: pages.find((page) => page.data?.root != null)?.data?.root ?? null,
    /**
     * Each page by key, oldest first, with its data once it has loaded,
     * and whether it is one the window opened with.
     */
    pages: pagesOf(view, results),
    /**
     * The window it's opening instead (see `jumpToLatest`), with its
     * pages and parts, shown once they've loaded (`showNext`).
     */
    next:
      next === undefined
        ? undefined
        : {
            pages: pagesOf(next, results, view.pages.length),
            parts: windowParts(
              next,
              results.slice(view.pages.length).map((page) => page.data),
            ),
          },
    /** Shows the window it's been opening instead. */
    showNext: () =>
      setState((current) =>
        current.next === undefined ? current : { view: current.next },
      ),
    /** Changes whenever the window reopens, so lists can remount. */
    viewKey: pageKey(view.opened),
    /**
     * At the latest messages and following new ones. Its newest page can
     * be momentarily full while the next one loads; the window is still at
     * the latest.
     */
    live,
    /** There are newer messages than the window has, out of its reach. */
    hasNewer: !live && (last?.hasNewer ?? false),
    hasOlder: first?.hasOlder ?? false,
    /**
     * Opens at the latest messages, keeping what's shown until they've
     * loaded.
     */
    jumpToLatest: () =>
      setState((current) => ({
        next: current.next ?? latestView(Date.now()),
        view: current.view,
      })),
    /**
     * Opens instead at the latest messages as they were at `openedAt`, as
     * saved then (see `features/saved`). Messages since then join below
     * them as they load, so nothing already showing moves.
     */
    openAt: (savedAt: number) => {
      const saved = latestView(savedAt);
      lastWindows.set(windowKey, { at: Date.now(), view: saved });
      setState({ view: saved });
    },
    loadNewer: () => {
      const newest = messages.at(-1);
      if (live || last?.hasNewer !== true || newest === undefined) return;
      addPage(pageAfter(newest), "end");
    },
    loadOlder: () => {
      const oldest = messages[0];
      if (first?.hasOlder !== true || oldest === undefined) return;
      addPage({ before: oldest.sentAt }, "start");
    },
    messages,
  };
}
