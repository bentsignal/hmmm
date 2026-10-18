import { useEffect, useState } from "react";

/** How long typing stays out of the way after a message lands. */
const SETTLE_MS = 900;

const NOBODY = Object.freeze<string[]>([]);

/**
 * Who's typing, held back for a moment after each new message when
 * `stepsAside`, so the message lands and the list settles before the
 * indicator shows again (see `TypingStyle`).
 */
export function useSettledTypists(
  typists: readonly string[],
  newestKey: string | undefined,
  stepsAside: boolean,
) {
  const [lastKey, setLastKey] = useState(newestKey);
  const [held, setHeld] = useState<string | undefined>(undefined);
  if (lastKey !== newestKey) {
    setLastKey(newestKey);
    if (stepsAside) setHeld(newestKey);
  }
  // eslint-disable-next-line no-restricted-syntax -- The hold ends as time passes, which no data change marks.
  useEffect(() => {
    if (held === undefined) return undefined;
    const timer = setTimeout(() => setHeld(undefined), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [held]);
  return stepsAside && held !== undefined ? NOBODY : typists;
}
