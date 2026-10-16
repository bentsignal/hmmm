import { useEffect } from "react";

import type { Message } from "~/features/conversation/types";
import { env } from "~/env";

/** What scripts can do in the open conversation (see `useDevConversation`). */
interface DevConversation {
  /** Adds or takes back your `emoji` on the newest message reading `text`. */
  react: (text: string, emoji: string) => void;
  send: (text: string) => void;
}

let open: DevConversation | undefined;

/** The open conversation, for `globalThis.veraDev.conversation()`. */
export function devConversation() {
  return open;
}

/**
 * Debug builds on a dev PDS only: lets scripts react and send in the open
 * conversation without tapping. The simulator's tap automation stalls the
 * app for a moment as it reads the screen, which would hide the frames that
 * `scripts/sim.sh frames` is measuring.
 */
export function useDevConversation({
  messages,
  toggleReaction,
  sendMessage,
}: {
  messages: readonly Message[];
  toggleReaction: (messageId: string, emoji: string) => void;
  sendMessage: (body: string) => void;
}) {
  // eslint-disable-next-line no-restricted-syntax -- Hands the open conversation to dev scripts, which run outside React; debug builds only.
  useEffect(() => {
    if (!__DEV__ || !env.devTools) return;
    open = {
      react: (text, emoji) => {
        const message = messages.findLast((item) => item.body === text);
        if (message === undefined) throw new Error(`No message "${text}"`);
        toggleReaction(message.id, emoji);
      },
      send: sendMessage,
    };
    return () => {
      open = undefined;
    };
  });
}
