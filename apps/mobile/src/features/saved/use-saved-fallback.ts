import { useEffect, useEffectEvent, useState } from "react";

/**
 * How long Home waits for the PDS on launch, and a conversation as it
 * opens, before showing what's saved on the device instead. Most opens
 * answer sooner and never show saved data; past these, waiting reads as
 * the app being stuck.
 */
export const HOME_DEADLINE_MS = 1000;
export const CONVERSATION_DEADLINE_MS = 800;

/**
 * Calls `onDeadline` once, `ms` after the screen opened, unless it's no
 * longer `waiting` by then.
 */
export function useDeadline(
  ms: number,
  waiting: boolean,
  onDeadline: () => void,
) {
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
 * Shows a screen's saved data (`show`, which fills in the queries still
 * waiting and says which it filled in) if it's still loading at the
 * deadline. Returns those queries, for `useShowingSaved`.
 */
export function useSavedFallback(
  ms: number,
  loading: boolean,
  show: () => readonly string[],
) {
  const [filled, setFilled] = useState<readonly string[]>([]);
  useDeadline(ms, loading, () => setFilled(show()));
  return filled;
}
