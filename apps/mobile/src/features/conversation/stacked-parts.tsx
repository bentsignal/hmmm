import { View } from "react-native";

import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import { attachmentPart } from "~/features/messaging/reactions";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { LinkCardView } from "./link-preview-card";
import { LinkedText } from "./linked-text";
import { linkPart } from "./message-parts";
import { linkCardsOf, visibleBody } from "./message-text";
import { Placed, Reactable } from "./reaction-parts";
import { RepliesFooter, ThreadFooter } from "./reply-card";

/**
 * A message's parts, top to bottom: its text, its attachments, and its
 * link cards (the first is the text's own when the text is all links).
 * Its thread's count goes after them. The text holds the row (see `MessageRowTarget`).
 */
export function StackedParts({ message }: { message: Message }) {
  const body = visibleBody(message);
  const cards = linkCardsOf(message);
  const cardsPlace = message.attachments.length + 1;
  return (
    <View className="items-start gap-1">
      {body !== undefined && (
        <Reactable part="message" place={0}>
          <LinkedText
            text={body}
            mentions={message.mentions}
            className="text-body text-foreground"
          />
        </Reactable>
      )}
      {message.attachments.map((attachment, index) => (
        <Reactable
          key={attachmentKey(attachment)}
          part={attachmentPart(message, index)}
          place={index + 1}
        >
          <AttachmentView
            attachment={attachment}
            sending={message.status === "sending"}
          />
        </Reactable>
      ))}
      {cards.map((card, index) => (
        <Reactable
          key={card.link}
          part={linkPart(message, index)}
          place={cardsPlace + index}
        >
          <LinkCardView card={card} />
        </Reactable>
      ))}
    </View>
  );
}

/** A thread's count, under the message's parts and their link cards. */
export function StackedFooter({
  message,
  card,
  replies,
}: {
  message: Message;
  card?: ReplyCard;
  replies?: ThreadReplies;
}) {
  if (card === undefined && replies === undefined) return null;
  return (
    <Placed
      place={message.attachments.length + linkCardsOf(message).length + 1}
    >
      {card !== undefined && <ThreadFooter message={message} card={card} />}
      {replies !== undefined && (
        <RepliesFooter message={message} replies={replies} />
      )}
    </Placed>
  );
}
