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

/** The window over the latest messages as of `openedAt`. */
export function latestView(openedAt: number): View {
  const opened = { before: openedAt + 1 };
  const pages = [opened, { after: openedAt }];
  return {
    anchor: undefined,
    followed: [],
    initial: pages,
    liveSince: openedAt,
    opened,
    pages,
  };
}

/** A window around one message. */
export function anchoredView(messageId: string): View {
  const opened = { around: messageId };
  return {
    anchor: messageId,
    followed: [],
    initial: [opened],
    liveSince: undefined,
    opened,
    pages: [opened],
  };
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
export function withPage(
  view: View,
  cursor: PageCursor,
  at: "end" | "start",
): View {
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
export function pageAfter(message: WindowMessage): PageCursor {
  return { after: message.sentAt - 1 };
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
): { readonly view: View } | "behind" | undefined {
  const index = view.pages.length - 1;
  const cursor = view.pages[index];
  const last = results[index];
  if (cursor === undefined || last === undefined || !last.fresh) {
    return undefined;
  }
  const key = pageKey(cursor);
  const followed = view.followed.includes(key);
  if (!last.data.hasNewer) {
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
  // In older messages: the list asks for newer ones as it scrolls down.
  if (view.liveSince === undefined) return undefined;
  if (!followed) return "behind";
  const newest = last.data.messages.at(-1);
  if (newest === undefined) return undefined;
  const next = withPage(view, pageAfter(newest), "end");
  return next === view ? undefined : { view: next };
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
    ...new Set(messages.map((message) => message.threadId ?? message.messageId)),
  ];
}
