import type { QueryKey, SkipToken } from "@tanstack/react-query";
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
 * grows), so its query can show that answer until the new one arrives.
 */
export function useHeldBatches() {
  const queryClient = useQueryClient();
  const [held, setHeld] = useState<HeldIds>(new Map());
  return {
    /**
     * The batch's last answer under the IDs it loaded with before, while
     * it loads under new ones. `queryOf` gives a batch's query.
     */
    placeholder: <Data>(
      ids: readonly string[],
      queryOf: (ids: readonly string[]) => {
        queryKey: QueryKey;
        queryFn?: ((context: never) => Data | Promise<Data>) | SkipToken;
      },
    ) => {
      const previous = previousIds(held, ids);
      return previous === undefined
        ? undefined
        : queryClient.getQueryData<Data>(queryOf(previous).queryKey);
    },
    /** Remembers the batches that have loaded under their own IDs. */
    remember: (loaded: readonly (readonly string[])[]) => {
      const next = withLoaded(held, loaded);
      if (next !== held) setHeld(next);
    },
  };
}
