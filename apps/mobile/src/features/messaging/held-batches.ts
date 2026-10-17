import type { QueryKey } from "@tanstack/react-query";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { HeldIds } from "./held-ids";
import { previousIds, withLoaded } from "./held-ids";

/**
 * Per-page queries (reactions, thread summaries) are keyed by their
 * batch's message IDs, so the newest page's batch gets a new key with every
 * message that arrives, and nothing has loaded under it yet. Showing
 * nothing meanwhile makes the reactions and thread replies on screen blink
 * out and back, and the list jump with them. This remembers the IDs each
 * batch last loaded with, by its first ID (which stays put as the batch
 * grows), so the batch can show that answer until the new one arrives.
 *
 * It fills in from the batch's `combine` rather than TanStack's
 * `placeholderData`, which only covers a query that hasn't settled. A PDS
 * query settles at once with a result that says it's still loading, which
 * its `select` turns into undefined, so on a slow phone the old answer
 * would never show.
 */
export function useHeldBatches() {
  const queryClient = useQueryClient();
  const [held, setHeld] = useState<HeldIds>(new Map());
  return {
    /**
     * The batch's answer (`own`), or while it has none under new IDs, its
     * last answer under the IDs it loaded with before. `queryOf` gives a
     * batch's query.
     */
    answer: <Raw, Data>(
      ids: readonly string[],
      own: Data | undefined,
      queryOf: (ids: readonly string[]) => {
        queryKey: QueryKey;
        select?: (raw: Raw) => Data | undefined;
      },
    ) => {
      if (own !== undefined) return own;
      const previous = previousIds(held, ids);
      if (previous === undefined) return undefined;
      const { queryKey, select } = queryOf(previous);
      const raw = queryClient.getQueryData<Raw>(queryKey);
      if (raw === undefined || select === undefined) return undefined;
      return select(raw);
    },
    /** Remembers the batches that have loaded under their own IDs. */
    remember: (loaded: readonly (readonly string[])[]) => {
      const next = withLoaded(held, loaded);
      if (next !== held) setHeld(next);
    },
  };
}
