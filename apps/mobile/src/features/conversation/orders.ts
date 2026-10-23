// Where each row sits in the list, as a number a worklet can compare
// (see `Move`): rows get theirs as they're built (see `buildMessageRows`).

/**
 * Where a row naturally sits in the list, oldest first, as a number a
 * worklet can compare: its message's time, or just before it for the
 * header above it. Rows get theirs as they're built (see `Orders`).
 */
export function rowOrder(date: Date, header = false) {
  return date.getTime() - (header ? 0.5 : 0);
}

/**
 * How far past the last order a row's goes when its own doesn't come
 * after it (see `Orders`): a power of two, so adding it to a time in
 * milliseconds is exact, and small enough that dozens fit before the next
 * millisecond's rows.
 */
const ORDER_STEP = 1 / 64;

/**
 * Hands out rows' orders as they're built, oldest first: each its
 * natural one (see `rowOrder`), or, when that doesn't come after the last
 * one handed out (two messages sent in the same millisecond, or a notice
 * at the moment of a message), a step past it. Moves tell rows apart by
 * order, and a row sharing one with a growing row stayed put while the
 * rows around it moved.
 */
export class Orders {
  #last = -Infinity;

  next(natural: number) {
    this.#last = Math.max(natural, this.#last + ORDER_STEP);
    return this.#last;
  }
}
