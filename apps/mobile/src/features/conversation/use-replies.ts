import type { RefObject } from "react";
import { useState } from "react";
import { useRouter } from "expo-router";

import type { ComposerHandle } from "./composer";
import type { ProfileOf } from "./message-row";
import type { Message, ThreadInfo } from "./types";
import { useAccount } from "~/features/messaging/account";
import { quoteOf } from "~/features/messaging/messages";
import { quoteText } from "./reply-parts";

/**
 * Replying from a conversation. A tap opens a message's thread. Reply
 * starts a message's thread from the conversation's own field ("Replying
 * to …" over it) while it has no replies; once it has (or on a reply), it
 * opens the thread with the keyboard up.
 */
export function useReplies({
  composer,
  conversationId,
  title,
  threadOf,
  profileOf,
}: {
  /** The conversation's field, which takes the reply. */
  composer: RefObject<ComposerHandle | null>;
  conversationId: string;
  /** The conversation's name, which the thread shows until it loads. */
  title: string;
  threadOf: (id: string) => ThreadInfo | undefined;
  profileOf: ProfileOf;
}) {
  const router = useRouter();
  const { address } = useAccount();
  // The message the next one replies to, starting its thread.
  const [replyTo, setReplyTo] = useState<Message>();

  /** Opens a message's thread (a reply's own), with the keyboard if asked. */
  function openThread(message: Message, focus = false) {
    router.push({
      params: {
        account: address,
        conversationId,
        ...(focus ? { focus: "1" } : {}),
        threadId: message.threadId ?? message.id,
        title,
      },
      pathname: "/thread/[threadId]",
    });
  }

  return {
    /** Set while the next message is a reply. */
    replyTo,
    /** What the field shows while replying. */
    replyingTo:
      replyTo === undefined
        ? undefined
        : {
            name: profileOf(replyTo.authorId).displayName,
            text: quoteText(quoteOf(replyTo)),
          },
    /** The next message isn't a reply after all (or was just sent). */
    cancel: () => setReplyTo(undefined),
    openThread: (message: Message) => openThread(message),
    reply: (message: Message) => {
      if (
        message.threadId !== undefined ||
        threadOf(message.id) !== undefined
      ) {
        openThread(message, true);
        return;
      }
      setReplyTo(message);
      composer.current?.focus();
    },
  };
}
