import { createContext, use, useState } from "react";

/**
 * When the list row this is in mounted (`performance.now()`), so a part of
 * it can tell whether it came with the row or arrived while you watched.
 */
export const RowMountedContext = createContext<number | undefined>(undefined);

/** Mounting this long after its row, a part arrived after the row did. */
const LATER_MS = 100;

/**
 * Whether this part arrived while its row was on screen (a reaction
 * added), so it animates in, rather than coming with the row as it
 * scrolled into view. Outside a list row (the menu's copy), it doesn't.
 */
export function useArrivedLater() {
  const rowMountedAt = use(RowMountedContext);
  const [later] = useState(
    () =>
      rowMountedAt !== undefined && performance.now() - rowMountedAt > LATER_MS,
  );
  return later;
}
