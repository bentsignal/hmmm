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
}

/** Whether `newest` is new, and a message one of those typing sent. */
function sentByTypist(seen: TypingSeen, newest: Newest | undefined) {
  if (newest === undefined || newest.key === seen.newestKey) return false;
  return (
    newest.authorId !== undefined && seen.typists.includes(newest.authorId)
  );
}

/**
 * What a change to who's typing, or to the newest row, does to the
 * indicator, which stays under the newest message while anyone types:
 * - `left`: who was showing, when the last one stopped, to show as it
 *   goes (`key`d to tell each apart). `became` when one of them sent the
 *   newest message as they stopped, which takes its place.
 * - `seen`: what it shows now.
 */
export function typingChange(
  seen: TypingSeen,
  newest: Newest | undefined,
  typists: readonly string[],
) {
  const newestKey = newest?.key;
  const arrived = seen.newestKey !== newestKey;
  if (!arrived && sameTypists(seen.typists, typists)) return undefined;
  const ended = seen.typists.length > 0 && typists.length === 0;
  return {
    left: ended
      ? {
          became: sentByTypist(seen, newest),
          key: [seen.newestKey, newestKey, ...seen.typists].join(" "),
          typists: seen.typists,
        }
      : undefined,
    seen: { newestKey, typists },
  };
}
