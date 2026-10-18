import { useEffect, useEffectEvent, useState } from "react";
import { DEFAULT_INITIAL_RESPONSE_TIMEOUT } from "@decentralized-convex/client";

import { isUnanswered, markUnanswered } from "./unanswered";

/**
 * How long a screen waits for its PDS before showing what's saved on the
 * device instead: as long as the PDS client waits for a server's first
 * answer before counting it as not answering.
 */
const SAVED_DEADLINE_MS = DEFAULT_INITIAL_RESPONSE_TIMEOUT;

/**
 * Calls `onDeadline` once, `ms` after the screen opened, unless it's no
 * longer `waiting` by then.
 */
function useDeadline(ms: number, waiting: boolean, onDeadline: () => void) {
  const fire = useEffectEvent(() => {
    if (waiting) onDeadline();
  });
  // eslint-disable-next-line no-restricted-syntax -- A deadline counts from when the screen opened, which only a timer started on mount can measure.
  useEffect(() => {
    const timer = setTimeout(fire, ms);
    return () => clearTimeout(timer);
  }, [ms]);
}

/**
 * Shows a screen's saved data (`show`, which returns the accounts it was
 * still waiting on) if it's still loading at the deadline. From then on
 * those accounts' PDSs count as not answering until they do, and their
 * screens show what's saved as soon as they open, without waiting again.
 */
export function useSavedFallback(
  addresses: readonly string[],
  loading: boolean,
  show: () => readonly string[],
) {
  const [ms] = useState(() =>
    addresses.length > 0 && addresses.every(isUnanswered)
      ? 0
      : SAVED_DEADLINE_MS,
  );
  useDeadline(ms, loading, () => {
    for (const address of show()) markUnanswered(address);
  });
}
