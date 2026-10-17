import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import { Avatar } from "~/components/avatar";
import { attachmentPart, partCount } from "~/features/messaging/reactions";
import { cn } from "~/lib/cn";
import { formatTime } from "~/lib/format";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { LinkCards } from "./link-preview-card";
import { LinkedText } from "./linked-text";
import { MenuTargetView } from "./message-actions";
import { InteractiveMessage } from "./message-reactions";
import { NotSent, SendingFade, SENT_FADE_MS } from "./message-status";
import { linkCardsOf, visibleBody } from "./message-text";
import { Placed, Reactable } from "./reaction-parts";
import { QuoteLine, RepliesFooter, ThreadFooter } from "./reply-card";

const AVATAR_COLUMN = 36;

/**
 * The part whose chips go under the whole message, under its thread's
 * count: the last one, unless link cards under the text come after it.
 */
function lastPart(message: Message, textShown: boolean, cards: number) {
  const attachments = message.attachments.length;
  if (cards > 0) return textShown ? null : "message";
  return attachments > 0 ? attachmentPart(message, attachments - 1) : "message";
}

/**
 * Slack/Discord-style: everyone left-aligned with a photo and name. A
 * reply has a line quoting the message it answers above it (see
 * `ReplyCard`), and a thread's original its count under it.
 */
export function MessageStacked({
  message,
  author,
  startsGroup,
  card,
  replies,
}: {
  message: Message;
  author: { avatarUrl: string | null; displayName: string };
  startsGroup: boolean;
  /** Set for a reply in the conversation. */
  card?: ReplyCard;
  /** Set for a thread's original in the conversation. */
  replies?: ThreadReplies;
}) {
  return (
    <View>
      {card !== undefined && (
        <QuoteLine message={message} card={card} avatarColumn={AVATAR_COLUMN} />
      )}
      <StackedRow
        message={message}
        author={author}
        startsGroup={startsGroup}
        card={card}
        replies={replies}
      />
    </View>
  );
}

/**
 * A message's parts, top to bottom: its text, its attachments, and its
 * link cards (the text's own when the text is all links). Its thread's
 * count goes after them.
 */
function StackedParts({ message }: { message: Message }) {
  const body = visibleBody(message);
  const cards = linkCardsOf(message);
  const cardsPlace = message.attachments.length + 1;
  return (
    <SendingFade status={message.status}>
      <View className="items-start gap-1">
        {body !== undefined && (
          <Reactable part="message" place={0}>
            <MenuTargetView>
              <LinkedText
                text={body}
                mentions={message.mentions}
                className="text-body text-foreground"
              />
            </MenuTargetView>
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
        {cards.length > 0 &&
          (body === undefined ? (
            <Reactable part="message" place={cardsPlace}>
              <LinkCards cards={cards} />
            </Reactable>
          ) : (
            <Placed place={cardsPlace}>
              <LinkCards cards={cards} />
            </Placed>
          ))}
      </View>
    </SendingFade>
  );
}

/** A thread's count, under the message's parts and their link cards. */
function StackedFooter({
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
    <Placed place={message.attachments.length + 2}>
      {card !== undefined && <ThreadFooter message={message} card={card} />}
      {replies !== undefined && (
        <RepliesFooter message={message} replies={replies} />
      )}
    </Placed>
  );
}

function StackedRow({
  message,
  author,
  startsGroup,
  card,
  replies,
}: {
  message: Message;
  author: { avatarUrl: string | null; displayName: string };
  startsGroup: boolean;
  /** A reply card's, under its quote, which leaves the space above it. */
  card?: ReplyCard;
  replies?: ThreadReplies;
}) {
  const chipsAtEnd = lastPart(
    message,
    visibleBody(message) !== undefined,
    linkCardsOf(message).length,
  );
  return (
    <View
      className={cn(
        "flex-row gap-3 px-4",
        card !== undefined || !startsGroup ? "pt-1.5" : "pt-5",
      )}
    >
      <View style={{ width: AVATAR_COLUMN }}>
        {startsGroup && (
          <Avatar name={author.displayName} size="row" uri={author.avatarUrl} />
        )}
      </View>
      <View className="flex-1 gap-1">
        {startsGroup && (
          <View className="flex-row items-baseline gap-2">
            <Text className="text-subhead text-foreground font-semibold">
              {author.displayName}
            </Text>
            {/* Always laid out, so the name never shifts; it fades in once
                the message is sent. */}
            <Animated.Text
              className="text-caption text-muted"
              style={{
                opacity: message.status === undefined ? 1 : 0,
                transitionDuration: SENT_FADE_MS,
                transitionProperty: "opacity",
                transitionTimingFunction: "ease-out",
              }}
            >
              {formatTime(message.sentAt)}
            </Animated.Text>
          </View>
        )}
        <InteractiveMessage
          message={message}
          align="start"
          shape="card"
          reactionStyle="chips"
          // The last part's reactions go under the thread's count.
          chipsAtEnd={chipsAtEnd}
          inner={chipsAtEnd === null || partCount(message) > 1}
        >
          <StackedParts message={message} />
          <StackedFooter message={message} card={card} replies={replies} />
        </InteractiveMessage>
        <NotSent message={message} />
      </View>
    </View>
  );
}
