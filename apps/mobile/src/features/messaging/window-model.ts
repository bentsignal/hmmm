// The window a screen shows of a conversation (or a thread's replies):
// which pages it asks for, how it follows new messages, and which queries
// its reactions and threads come from. Plain functions, so they're tested
// without React (window-model.test.ts); `useMessageWindow` runs them.
//
// A window over the latest messages is a page frozen at the moment it
// opened (`before`) and pages after it (`after`). The last of those is
// live: messages arrive in it, and once it's full (`hasNewer`) the next
// page starts after its last message. Older pages load as the list
// scrolls up. Everything sent or reacted to after the window reached the
// latest messages (`liveSince`) comes from queries by time (`since`), so a
// message arriving changes no query's key.

export type PageCursor =
  | { readonly after: number }
  | { readonly around: string }
  | { readonly before: number };

export interface WindowMessage {
  readonly messageId: string;
  readonly sentAt: number;
  readonly threadId?: string;
}

export interface PageData<Message extends WindowMessage = WindowMessage> {
  readonly hasNewer: boolean;
  readonly hasOlder: boolean;
  readonly messages: readonly Message[];
}

/** A page's result, and whether it's come from the PDS since the screen opened. */
export interface PageResult<Message extends WindowMessage = WindowMessage> {
  readonly data: PageData<Message>;
  /**
   * From the PDS since the screen opened, or kept up to date by it all
   * along (see `stayLive`), rather than a copy that may be behind.
   */
  readonly fresh: boolean;
  /** When it arrived. */
  readonly at: number;
}

export interface View {
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
  /**
   * Once the window has reached the latest messages: messages sent after
   * this, and reactions and replies made after it, come from queries by
   * time (`since`).
   */
  readonly liveSince: number | undefined;
  /**
   * Pages seen, fresh, with nothing newer: the window follows each one, and
   * starts the next when it fills up. A page that's already full when first
   * seen means the window is behind, and opens again at the latest.
   */
  readonly followed: readonly string[];
}

/** The most pages a window reopens with; past this it starts afresh. */
export const MAX_REUSED_PAGES = 6;

/** A page cursor's identity, stable across renders. */
export function pageKey(cursor: PageCursor) {
  return JSON.stringify(cursor);
}

/** `view`, as any window (rather than the kind it's made as). */
function asView(view: View) {
  return view;
}

/** The window over the latest messages as of `openedAt`. */
export function latestView(openedAt: number) {
  const opened = { before: openedAt + 1 };
  const pages = [opened, { after: openedAt }];
  return asView({
    anchor: undefined,
    followed: [],
    initial: pages,
    liveSince: openedAt,
    opened,
    pages,
  });
}

/** A window around one message. */
export function anchoredView(messageId: string) {
  const opened = { around: messageId };
  return asView({
    anchor: messageId,
    followed: [],
    initial: [opened],
    liveSince: undefined,
    opened,
    pages: [opened],
  });
}

/** Every loaded message once, oldest first. */
export function mergePages<Message extends WindowMessage>(
  pages: readonly (PageData<Message> | undefined)[],
) {
  const byId = new Map(
    pages
      .flatMap((page) => page?.messages ?? [])
      .map((message) => [message.messageId, message] as const),
  );
  return [...byId.values()].sort(
    (left, right) =>
      left.sentAt - right.sentAt ||
      left.messageId.localeCompare(right.messageId),
  );
}

/** Adds a page unless the window already has it. */
export function withPage(view: View, cursor: PageCursor, at: "end" | "start") {
  const key = pageKey(cursor);
  if (view.pages.some((page) => pageKey(page) === key)) return view;
  return {
    ...view,
    pages: at === "start" ? [cursor, ...view.pages] : [...view.pages, cursor],
  };
}

/**
 * The page after `message`, the newest of a full page. Its cursor is a
 * millisecond earlier, so a message sent the same millisecond isn't
 * skipped; the one already loaded shows once.
 */
export function pageAfter(message: WindowMessage) {
  return { after: message.sentAt - 1 };
}

/**
 * The window's newest page has nothing newer: it's followed from now on,
 * and the window is at the latest messages, if it wasn't already.
 */
function reached(
  view: View,
  key: string,
  results: readonly (PageResult | undefined)[],
) {
  const followed = view.followed.includes(key);
  if (followed && view.liveSince !== undefined) return undefined;
  const newest = mergePages(results.map((result) => result?.data)).at(-1);
  return {
    view: {
      ...view,
      followed: followed ? view.followed : [...view.followed, key],
      liveSince: view.liveSince ?? newest?.sentAt ?? Date.now(),
    },
  };
}

/**
 * The window's newest page is full: if the window followed it as it
 * filled, the next page starts after it; if it was full when first seen,
 * the window is behind. Behind with the reader scrolled back in older
 * messages (`atLatest` false), it follows anyway: the pages it adds go
 * under what they're reading, out of sight, where opening again at the
 * latest moved the list from under them to the newest message.
 */
function filled(view: View, key: string, last: PageData, atLatest: boolean) {
  // In older messages: the list asks for newer ones as it scrolls down.
  if (view.liveSince === undefined) return undefined;
  if (!view.followed.includes(key) && atLatest) return "behind" as const;
  const newest = last.messages.at(-1);
  if (newest === undefined) return undefined;
  const next = withPage(view, pageAfter(newest), "end");
  return next === view ? undefined : { view: next };
}

/**
 * What the window does next, given its pages' results: nothing, `view`
 * (it reached the latest messages, followed a page, or started the next
 * after a full one), or `behind` when it's more than a page behind the
 * latest messages, so following page by page would add whole pages under
 * the reader; it opens again at the latest instead.
 */
export function advance(
  view: View,
  results: readonly (PageResult | undefined)[],
  /** The reader is at the latest messages (see `filled`). */
  atLatest = true,
) {
  const index = view.pages.length - 1;
  const cursor = view.pages[index];
  const last = results[index];
  if (cursor === undefined || last?.fresh !== true) return undefined;
  const key = pageKey(cursor);
  return last.data.hasNewer
    ? filled(view, key, last.data, atLatest)
    : reached(view, key, results);
}

/**
 * The window and the one it's opening instead (`next`, see
 * `jumpToLatest`), each advanced with its pages' results. Behind, it opens
 * again at the latest messages as of when it learned it was behind
 * (`behind`), and shows them once they've loaded, unless the reader
 * scrolls back up first: then it follows from where it is (see `filled`).
 * The same state back when nothing changed.
 */
export function follow(
  state: {
    readonly view: View;
    readonly next: View | undefined;
    readonly behind?: boolean;
  },
  results: readonly (PageResult | undefined)[],
  nextResults: readonly (PageResult | undefined)[],
  /** The reader is at the latest messages (see `filled`). */
  atLatest: boolean,
) {
  const kept = opening(state, atLatest);
  const step = advance(state.view, results, atLatest);
  const view = stepped(state.view, step);
  const behindAt = step === "behind" ? results.at(-1)?.at : undefined;
  if (kept === undefined && behindAt !== undefined) {
    return { behind: true, next: latestView(behindAt), view };
  }
  const next = kept && stepped(kept, advance(kept, nextResults));
  if (view === state.view && next === state.next) return state;
  return { behind: next !== undefined && state.behind === true, next, view };
}

/**
 * What the window is still opening instead: not a reopen at the latest the
 * reader has scrolled up from.
 */
function opening(
  state: { readonly next: View | undefined; readonly behind?: boolean },
  atLatest: boolean,
) {
  return state.behind === true && !atLatest ? undefined : state.next;
}

/** The view after `advance`'s step, if it took one. */
function stepped(view: View, step: ReturnType<typeof advance>) {
  return typeof step === "object" ? step.view : view;
}

/**
 * Whether the window last shown can open again: it reopens with what's
 * cached of its pages, so it shows at once. One more than a page behind
 * (its newest page full), or grown past `MAX_REUSED_PAGES`, opens afresh.
 */
export function reusable(
  view: View,
  last: PageData | undefined,
  { age, maxAge }: { age: number; maxAge: number },
) {
  return (
    view.anchor === undefined &&
    age < maxAge &&
    view.pages.length <= MAX_REUSED_PAGES &&
    last?.hasNewer !== true
  );
}

/**
 * Which queries the window's reactions and threads come from: per-page
 * batches of message IDs for what was sent before `liveSince` (each a
 * fixed set), and queries by time for everything since.
 */
export function windowParts<Message extends WindowMessage>(
  view: Pick<View, "liveSince">,
  pages: readonly (PageData<Message> | undefined)[],
) {
  const { liveSince } = view;
  function before(message: WindowMessage) {
    return liveSince === undefined || message.sentAt <= liveSince;
  }
  const settled = pages.map((page) => (page?.messages ?? []).filter(before));
  const live = pages.flatMap((page) =>
    (page?.messages ?? []).filter((message) => !before(message)),
  );
  return {
    /** Each page's messages sent before `liveSince`, for reaction batches. */
    messageIds: settled.map((messages) =>
      messages.map((message) => message.messageId),
    ),
    /** Each page's threads among those, for thread summary batches. */
    threadIds: settled.map((messages) => threadsOf(messages)),
    /** Messages since `liveSince`, whose reactions and threads come by time. */
    liveIds: live.map((message) => message.messageId),
    liveThreadIds: threadsOf(live),
    since: liveSince,
  };
}

/** Messages' threads: their own, or for a reply, its original's. */
function threadsOf(messages: readonly WindowMessage[]) {
  return [
    ...new Set(
      messages.map((message) => message.threadId ?? message.messageId),
    ),
  ];
}
