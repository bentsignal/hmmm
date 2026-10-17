/** The IDs each batch last loaded with, by the batch's first ID. */
export type HeldIds = ReadonlyMap<string, readonly string[]>;

function sameIds(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

/**
 * The IDs a batch loaded with before, while it loads under `ids`; undefined
 * once it has loaded under them, or if it never loaded.
 */
export function previousIds(held: HeldIds, ids: readonly string[]) {
  const previous = ids[0] === undefined ? undefined : held.get(ids[0]);
  return previous === undefined || sameIds(previous, ids)
    ? undefined
    : previous;
}

/** `held` with the batches that loaded, or `held` itself if none changed. */
export function withLoaded(
  held: HeldIds,
  loaded: readonly (readonly string[])[],
) {
  const changed = loaded.flatMap((ids) => {
    const first = ids[0];
    return first === undefined || sameIds(held.get(first) ?? [], ids)
      ? []
      : [[first, ids] as const];
  });
  return changed.length === 0 ? held : new Map([...held, ...changed]);
}
