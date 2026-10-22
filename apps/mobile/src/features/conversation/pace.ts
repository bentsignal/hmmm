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
  return next.slice(shown.length).every((message) => message.authorId !== self);
}

/** Nobody's message is waiting (see `waitingAuthors`). */
const NOBODY_WAITING = new Set<string>();

/**
 * Who has a message in `next` that `shown` doesn't show yet: messages
 * waiting their turn. They still show as typing until it does, so it grows
 * out of their indicator rather than the indicator closing first.
 */
export function waitingAuthors(
  shown: readonly Message[],
  next: readonly Message[],
) {
  if (shown === next) return NOBODY_WAITING;
  const ids = new Set(shown.map((message) => message.id));
  const authors = new Set<string>();
  for (const message of next) {
    if (!ids.has(message.id)) authors.add(message.authorId);
  }
  return authors.size === 0 ? NOBODY_WAITING : authors;
}
