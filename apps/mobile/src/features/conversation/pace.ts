import type { Message } from "./types";

// When the list takes others' new messages (see `usePacedMessages`).

/** Whether two lists hold the same messages, in the same order. */
export function sameMessages(
  left: readonly Message[],
  right: readonly Message[],
) {
  return (
    left === right ||
    (left.length === right.length &&
      left.every((message, index) => message === right[index]))
  );
}

/**
 * Whether `next` only adds messages from other people after `shown`'s
 * newest, which can wait their turn. Anything else shows at once: your own
 * message, an older page, a reaction, an edit, a deletion.
 */
export function onlyOthersArrived(
  shown: readonly Message[],
  next: readonly Message[],
  self: string,
) {
  if (next.length <= shown.length) return false;
  for (let index = 0; index < shown.length; index += 1) {
    if (next[index] !== shown[index]) return false;
  }
  return next
    .slice(shown.length)
    .every((message) => message.authorId !== self);
}

/**
 * How long others' new messages wait, after a redraw at `shownAt`, for
 * the rise it started (`paceMs`) to finish. Nearly done, they go now: the
 * app's query updates come at the same pace (see `NOTIFY_GAP_MS`), and a
 * redraw of its own a moment later would cost more than it saves.
 */
export function waitFor(shownAt: number, now: number, paceMs: number) {
  const wait = shownAt + paceMs - now;
  return wait <= paceMs / 4 ? 0 : wait;
}
