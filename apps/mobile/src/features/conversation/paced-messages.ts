import { useEffect, useState } from "react";

import type { Message } from "./types";
import { GROW_MS } from "./moves";
import { onlyOthersArrived, sameMessages, waitFor } from "./pace";

// How fast the list takes new messages from other people. Each one that
// arrives redraws the list and rises in over `GROW_MS`; in a busy
// conversation they came faster than that, each a separate redraw, and
// the list fell seconds behind. Now a message arriving during another's
// rise waits for it to finish, and the ones that waited rise in together.
// At a normal pace nothing waits: the first after a pause shows at once.

/** The least time between two redraws for others' new messages. */
export const PACE_MS = GROW_MS;

/**
 * `messages`, with others' new ones paced (see `onlyOthersArrived`). The
 * same array while they're the same messages, so the list redraws only
 * when what it shows changes.
 */
export function usePacedMessages(messages: readonly Message[], self: string) {
  const [shown, setShown] = useState({ at: 0, messages });
  const same = sameMessages(shown.messages, messages);
  // Anything but others' new messages shows in this very render.
  if (!same && !onlyOthersArrived(shown.messages, messages, self)) {
    setShown({ at: shown.at, messages });
  }
  const waiting = !same;
  // eslint-disable-next-line no-restricted-syntax -- Waiting for a rise to finish is a matter of time, which no data change marks.
  useEffect(() => {
    if (!waiting) return undefined;
    const wait = waitFor(shown.at, Date.now(), PACE_MS);
    const show = () => setShown({ at: Date.now(), messages });
    if (wait === 0) {
      show();
      return undefined;
    }
    const timer = setTimeout(show, wait);
    return () => clearTimeout(timer);
  }, [messages, shown.at, waiting]);
  return shown.messages;
}
