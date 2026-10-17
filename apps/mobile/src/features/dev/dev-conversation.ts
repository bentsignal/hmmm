import { useEffect } from "react";

import type { Message } from "~/features/conversation/types";
import type { OutgoingDraft } from "~/features/messaging/outbox";
import type { ReactionPart } from "~/features/messaging/reactions";
import { env } from "~/env";
import { attachmentPart } from "~/features/messaging/reactions";

/** What scripts can do in the open conversation (see `useDevConversation`). */
interface DevConversation {
  /**
   * Adds or takes back your `emoji` on the newest message reading `text`,
   * or on its attachment at `attachment`.
   */
  react: (text: string, emoji: string, attachment?: number) => void;
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
  toggleReaction: (
    messageId: string,
    emoji: string,
    part: ReactionPart,
  ) => void;
  sendMessage: (draft: OutgoingDraft) => void;
}) {
  // eslint-disable-next-line no-restricted-syntax -- Hands the open conversation to dev scripts, which run outside React; debug builds only.
  useEffect(() => {
    if (!__DEV__ || !env.devTools) return;
    open = {
      react: (text, emoji, attachment) => {
        const message = messages.findLast((item) => item.body === text);
        if (message === undefined) throw new Error(`No message "${text}"`);
        const part =
          attachment === undefined
            ? "message"
            : attachmentPart(message, attachment);
        toggleReaction(message.id, emoji, part);
      },
      send: (body) =>
        sendMessage({ body, files: [], linkPreviews: [], mentions: [] }),
    };
    return () => {
      open = undefined;
    };
  });
}
