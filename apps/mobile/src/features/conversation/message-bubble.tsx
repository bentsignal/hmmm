import { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import { Avatar } from "~/components/avatar";
import { attachmentPart } from "~/features/messaging/reactions";
import { cn } from "~/lib/cn";
import { Appearing } from "./appearing";
import { useBecoming } from "./arrive";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { AuthorLink } from "./author-link";
import { BubbleBody } from "./bubble-body";
import { GrowingText } from "./bubble-morph";
import { MovingQuote, MovingReplyCurve } from "./bubble-reply";
import { aboveBubble, bubbleTopPart } from "./bubble-top";
import { Settle, useChangedSinceMount, usePieceLift } from "./grow";
import { LinkCardView } from "./link-preview-card";
import { MenuTargetView } from "./message-actions";
import { DeletedBubble, EditedLabel } from "./message-changes";
import { linkPart, partCount } from "./message-parts";
import { InteractiveMessage } from "./message-reactions";
import { NotSent, SendingFade } from "./message-status";
import { linkCardsOf, visibleBody } from "./message-text";
import { Reactable } from "./reaction-parts";
import { RepliesFooter, ThreadFooter } from "./reply-card";
import { replyIndent } from "./reply-parts";
import { RevealedTime, SlideWithReveal } from "./reveal";
import { BUBBLE_COLUMN_GAP, BUBBLE_HEADER, bubbleHeader } from "./row-header";
import { useRowOrder } from "./row-order";
import { Place } from "./row-place";

/** Width of the avatar column beside incoming bubbles in group chats. */
const AVATAR_COLUMN = 28;
const { nameGap: NAME_GAP, nameLine: NAME_LINE } = BUBBLE_HEADER;
/** The sender's name above a run, and the gap under it, together. */
const NAME_HEIGHT = NAME_LINE + NAME_GAP;
/** The name's padding on each side (`px-3`). */
const NAME_INSET = 12;

function Content({
  message,
  isOwn,
  endsGroup,
  quoted,
}: {
  message: Message;
  isOwn: boolean;
  endsGroup: boolean;
  /** A reply card's reply: indented under its quote, with the curve. */
  quoted: boolean;
}) {
  const body = visibleBody(message);
  const cards = linkCardsOf(message);
  // Its parts top to bottom: the attachments, then the text.
  const textPlace = message.attachments.length;
  // Only a thread's original stays deleted, never a quoted reply.
  if (message.deleted === true) return <DeletedBubble />;
  return (
    <SendingFade status={message.status}>
      {/* 4pt between a message's parts, the same as between bubbles. */}
      <View
        className={cn("gap-1", isOwn ? "items-end" : "items-start")}
        style={quoted ? replyIndent(isOwn) : undefined}
      >
        {quoted && <MovingReplyCurve message={message} isOwn={isOwn} />}
        {message.attachments.map((attachment, index) => (
          <Reactable
            key={attachmentKey(attachment)}
            part={attachmentPart(message, index)}
            place={index}
          >
            <AttachmentView
              attachment={attachment}
              sending={message.status === "sending"}
            />
          </Reactable>
        ))}
        {body !== undefined && (
          <Reactable part="message" place={textPlace}>
            <MenuTargetView>
              <BubbleBody
                text={body}
                mentions={message.mentions}
                isOwn={isOwn}
                tail={endsGroup && cards.length === 0}
              />
            </MenuTargetView>
          </Reactable>
        )}
        {/* Under the text, in the order of its links. */}
        {cards.map((card, index) => (
          <Reactable
            key={card.link}
            part={linkPart(message, index)}
            place={textPlace + 1 + index}
          >
            <LinkCardView card={card} />
          </Reactable>
        ))}
      </View>
    </SendingFade>
  );
}

/** The sender's photo beside the last bubble of a run in group chats. */
function AvatarColumn({
  address,
  author,
  visible,
}: {
  address: string;
  author: { avatarUrl: string | null; displayName: string };
  visible: boolean;
}) {
  return (
    <View style={{ width: AVATAR_COLUMN }}>
      {visible && (
        <AuthorLink address={address} name={author.displayName}>
          <Avatar name={author.displayName} size="sm" uri={author.avatarUrl} />
        </AuthorLink>
      )}
    </View>
  );
}

/**
 * The sender's name above a run. Tapbacks that open space under it move it
 * up with the rows above (see `GrowingSpace`).
 */
function SenderName({
  address,
  name,
  order,
  onEnd,
}: {
  address: string;
  name: string;
  order: number;
  /** Where the name's text ends, inside its padding. */
  onEnd: (end: number) => void;
}) {
  const lift = usePieceLift(order, Place.top);
  // Growing out of the typing bubble, it fades in with the text.
  const becoming = useBecoming();
  return (
    <Animated.View style={lift}>
      <GrowingText growing={becoming}>
        <AuthorLink address={address} name={name}>
          <Text
            numberOfLines={1}
            className="text-caption text-muted px-3"
            style={{ lineHeight: NAME_LINE, marginBottom: NAME_GAP - 2 }}
            onLayout={(event) =>
              onEnd(event.nativeEvent.layout.width - NAME_INSET)
            }
          >
            {name}
          </Text>
        </AuthorLink>
      </GrowingText>
    </Animated.View>
  );
}

/**
 * A message's bubbles, with its sender's name, tapbacks, and status. A
 * reply shows the message it answers above it, and how many more replies
 * there are under it (see `ReplyCard`); a thread's original, how many it
 * has.
 */
function BubbleColumn({
  message,
  isOwn,
  name,
  endsGroup,
  card,
  replies,
}: {
  message: Message;
  isOwn: boolean;
  /** The sender's name, above the first bubble of a run in group chats. */
  name?: string;
  endsGroup: boolean;
  card?: ReplyCard;
  replies?: ThreadReplies;
}) {
  const order = useRowOrder(message);
  // Its first reply came while you watched (see `Appearing`).
  const repliesLate = useChangedSinceMount(replies !== undefined);
  // Where the name's text ends, inside its padding.
  const [nameEnd, setNameEnd] = useState<number>();
  // Tapbacks rise beside the name, which keeps its place. Over a quote,
  // they open their own space.
  const besideName = name !== undefined && card === undefined;
  return (
    <View
      className={cn("max-w-[75%] gap-0.5", isOwn ? "items-end" : "items-start")}
    >
      {name !== undefined && (
        <SenderName
          address={message.authorId}
          name={name}
          order={order}
          onEnd={setNameEnd}
        />
      )}
      {card !== undefined && <MovingQuote message={message} card={card} />}
      <InteractiveMessage
        message={message}
        align={isOwn ? "end" : "start"}
        shape="plain"
        reactionStyle="tapbacks"
        top={bubbleTopPart(message)}
        inner={partCount(message) > 1}
        roomAbove={besideName ? NAME_HEIGHT : 0}
        tapbacksClearOf={besideName ? nameEnd : undefined}
        liftedFromRow
      >
        <Content
          message={message}
          isOwn={isOwn}
          endsGroup={endsGroup}
          quoted={card !== undefined}
        />
      </InteractiveMessage>
      <EditedLabel message={message} isOwn={isOwn} />
      <NotSent message={message} gap={BUBBLE_COLUMN_GAP} />
      {card !== undefined && (
        <View style={replyIndent(isOwn)}>
          <ThreadFooter message={message} card={card} isOwn={isOwn} />
        </View>
      )}
      {replies !== undefined && (
        <Appearing
          late={repliesLate}
          order={order}
          place={Place.bottom}
          gap={BUBBLE_COLUMN_GAP}
        >
          <RepliesFooter message={message} replies={replies} isOwn={isOwn} />
        </Appearing>
      )}
    </View>
  );
}

/**
 * iMessage-style: your messages on the right, everyone else's on the left,
 * runs tucked together with a tail on the last one. Times stay hidden until
 * the conversation is dragged left.
 */
export function MessageBubble({
  message,
  isOwn,
  author,
  startsGroup,
  endsGroup,
  card,
  replies,
}: {
  message: Message;
  isOwn: boolean;
  /** Set in group chats, where incoming runs show a name and photo. */
  author?: { avatarUrl: string | null; displayName: string };
  startsGroup: boolean;
  endsGroup: boolean;
  /** Set for a reply in the conversation. */
  card?: ReplyCard;
  /** Set for a thread's original in the conversation. */
  replies?: ThreadReplies;
}) {
  const order = useRowOrder(message);
  const showAuthor = author !== undefined && !isOwn;
  return (
    // `BUBBLE_HEADER`'s gaps.
    <View className={startsGroup ? "pt-3.5" : "pt-1"}>
      <Settle
        header={bubbleHeader(startsGroup, startsGroup && showAuthor)}
        order={order}
      />
      <SlideWithReveal enabled={isOwn}>
        <View
          className={cn(
            "flex-row items-end gap-2.5 px-4",
            isOwn ? "justify-end" : "justify-start",
          )}
        >
          {showAuthor && (
            <AvatarColumn
              address={message.authorId}
              author={author}
              visible={endsGroup}
            />
          )}
          <BubbleColumn
            message={message}
            isOwn={isOwn}
            name={startsGroup && showAuthor ? author.displayName : undefined}
            endsGroup={endsGroup}
            card={card}
            replies={replies}
          />
        </View>
      </SlideWithReveal>
      <RevealedTime
        date={message.sentAt}
        top={aboveBubble(message, startsGroup && showAuthor ? NAME_HEIGHT : 0)}
      />
    </View>
  );
}
