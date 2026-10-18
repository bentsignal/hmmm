import type { MessageRow } from "./build-rows";

// How the typing indicator changes as people start and stop, and as
// messages arrive (see `TypingSpace`).

/** The newest row, as the typing indicator watches it. */
export interface Newest {
  key: string;
  /** Who wrote it, when it's a message. */
  authorId: string | undefined;
}

/** The newest of rows newest first (see `newestFirst`). */
export function newestOf(rows: readonly MessageRow[]) {
  const [row] = rows;
  if (row === undefined) return undefined;
  return {
    authorId: row.type === "message" ? row.message.authorId : undefined,
    key: row.key,
  };
}

function sameTypists(left: readonly string[], right: readonly string[]) {
  return left.join() === right.join();
}

/** What the indicator last showed. */
export interface TypingSeen {
  newestKey: string | undefined;
  typists: readonly string[];
  /** The last change came with a new message. */
  arrived: boolean;
}

/** Whether `newest` is new, and a message one of those typing sent. */
function sentByTypist(seen: TypingSeen, newest: Newest | undefined) {
  if (newest === undefined || newest.key === seen.newestKey) return false;
  return (
    newest.authorId !== undefined && seen.typists.includes(newest.authorId)
  );
}

/** What showed until the indicator ended, as `newestKey` came. */
function leftOf(seen: TypingSeen, newestKey: string | undefined) {
  return {
    became: seen.newestKey !== newestKey,
    key: [seen.newestKey, newestKey, ...seen.typists].join(" "),
    typists: seen.typists,
  };
}

/**
 * What a change to who's typing, or to the newest row, does:
 * - `left`: who was showing, if the indicator ended, to show as it goes
 *   (`key`d to tell each apart). `became` when it became the newest
 *   message.
 * - `reopened`: the space opened or closed along with a message (or
 *   nothing else), so it changes in the same commit as that.
 * - `reappeared`: a typist's message came while others still type, so
 *   the indicator shows again under it, as it did the first time.
 */
export function typingChange(
  seen: TypingSeen,
  newest: Newest | undefined,
  typists: readonly string[],
) {
  const newestKey = newest?.key;
  const arrived = seen.newestKey !== newestKey;
  if (!arrived && sameTypists(seen.typists, typists)) return undefined;
  const wasTyping = seen.typists.length > 0;
  const typing = typists.length > 0;
  const sent = sentByTypist(seen, newest);
  const ended = wasTyping && (!typing || sent);
  return {
    left: ended ? leftOf(seen, newestKey) : undefined,
    reappeared: typing && sent,
    reopened: typing ? !wasTyping : arrived && wasTyping,
    seen: { arrived, newestKey, typists },
  };
}
