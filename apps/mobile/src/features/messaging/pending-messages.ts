import type {
  Attachment,
  LinkCard,
  Message as PdsMessage,
} from "@decentralized-convex/messages";
import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useMutation } from "@tanstack/react-query";
import { pdsMutation } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { useAccount } from "./account";

export interface PendingMessage {
  readonly attachments: Attachment[];
  readonly body: string;
  readonly failed: boolean;
  /** Its link cards, with the previews prefetched while it was typed. */
  readonly linkPreviews: LinkCard[] | undefined;
  readonly messageId: string;
  readonly sentAt: number;
}

/** Messages this device sent that the PDS hasn't confirmed yet. */
export function usePendingMessages(conversationId: string) {
  const { address } = useAccount();
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const send = useMutation(
    pdsMutation({ mutation: pds.messages.send, session: address }),
  );

  function markFailed(messageId: string) {
    setPending((current) =>
      current.map((item) =>
        item.messageId === messageId ? { ...item, failed: true } : item,
      ),
    );
  }

  function sendMessage(
    body: string,
    attachments: Attachment[],
    linkPreviews: readonly LinkCard[],
  ) {
    const message = {
      attachments,
      body,
      failed: false,
      linkPreviews: linkPreviews.length > 0 ? [...linkPreviews] : undefined,
      messageId: Crypto.randomUUID(),
      sentAt: Date.now(),
    };
    setPending((current) => [...current, message]);
    send.mutate(
      { attachments, body, conversationId, messageId: message.messageId },
      { onError: () => markFailed(message.messageId) },
    );
  }

  return { pending, sendMessage };
}

/**
 * A sent message's cards, filled in from what this device prefetched where
 * the PDS is still fetching, so a card shown when it was sent stays up.
 */
export function withPrefetched(
  message: PdsMessage,
  sent: PendingMessage | undefined,
) {
  const prefetched = sent?.linkPreviews;
  if (prefetched === undefined || message.linkPreviews === undefined) {
    return message;
  }
  return {
    ...message,
    linkPreviews: message.linkPreviews.map((card) =>
      card.preview === undefined
        ? (prefetched.find(({ link }) => link === card.link) ?? card)
        : card,
    ),
  };
}
