import type { ReactNode } from "react";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import { Avatar } from "~/components/avatar";
import { cn } from "~/lib/cn";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { AuthorLink } from "./author-link";
import { BUBBLE_RADIUS, BubbleTail, TAIL_DROP } from "./bubble-shape";
import { rowOrder } from "./build-rows";
import { useOwnLift } from "./grow";
import { LinkCards } from "./link-preview-card";
import { LinkedText } from "./linked-text";
import { MenuTargetView } from "./message-actions";
import { InteractiveMessage, TopPart } from "./message-reactions";
import { NotSent, SendingFade } from "./message-status";
import { linkCardsOf, visibleBody } from "./message-text";
import {
  QUOTE_GAP,
  QuoteBubble,
  RepliesFooter,
  ReplyCurve,
  ThreadFooter,
} from "./reply-card";
import { replyIndent } from "./reply-parts";
import { RevealedTime, SlideWithReveal } from "./reveal";
import { TAPBACK_SPACE } from "./tapbacks";

/** Width of the avatar column beside incoming bubbles in group chats. */
const AVATAR_COLUMN = 28;
/** The sender's line above a run, and the gap under it. */
const NAME_LINE = 16;
const NAME_GAP = 6;
/** The sender's name above a run, and the gap under it, together. */
const NAME_HEIGHT = NAME_LINE + NAME_GAP;
/** The name's padding on each side (`px-3`). */
const NAME_INSET = 12;

/**
 * A message's text in its bubble: a plain rounded background, and the tail
 * drawn over its corner when it ends a run. Nothing is measured, so a
 * bubble renders once.
 */
function Body({
  text,
  mentions,
  isOwn,
  tail,
}: {
  text: string;
  mentions: Message["mentions"];
  isOwn: boolean;
  tail: boolean;
}) {
  const outgoing = useCSSVariable("--color-bubble-outgoing");
  const incoming = useCSSVariable("--color-bubble-incoming");
  const color = isOwn ? outgoing : incoming;
  const fill = typeof color === "string" ? color : undefined;
  return (
    <View
      className="px-3.5 py-2"
      style={{
        backgroundColor: fill,
        borderCurve: "continuous",
        borderRadius: BUBBLE_RADIUS,
        // Room for the tail hanging below, so nothing under it overlaps.
        marginBottom: tail ? TAIL_DROP : 0,
      }}
    >
      {tail && fill !== undefined && <BubbleTail color={fill} isOwn={isOwn} />}
      <LinkedText
        text={text}
        mentions={mentions}
        className={cn(
          "text-body leading-[22px]",
          isOwn ? "text-on-accent" : "text-foreground",
        )}
      />
    </View>
  );
}

/** `TopPart` around the message's first part only. */
function TopPartIf({ top, children }: { top: boolean; children: ReactNode }) {
  return top ? <TopPart>{children}</TopPart> : children;
}

/** The space between a reply's quote and its bubble. */
function quoteGap(message: Message) {
  const reacted = (message.reactions?.length ?? 0) > 0;
  return QUOTE_GAP + (reacted ? TAPBACK_SPACE : 0);
}

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
  return (
    <SendingFade status={message.status}>
      {/* 4pt between a message's parts, the same as between bubbles. */}
      <View
        className={cn("gap-1", isOwn ? "items-end" : "items-start")}
        style={quoted ? replyIndent(isOwn) : undefined}
      >
        {quoted && <ReplyCurve isOwn={isOwn} above={quoteGap(message)} />}
        {message.attachments.map((attachment, index) => (
          <TopPartIf key={attachmentKey(attachment)} top={index === 0}>
            <AttachmentView
              attachment={attachment}
              sending={message.status === "sending"}
            />
          </TopPartIf>
        ))}
        {body !== undefined && (
          <TopPartIf top={message.attachments.length === 0}>
            <MenuTargetView>
              <Body
                text={body}
                mentions={message.mentions}
                isOwn={isOwn}
                tail={endsGroup && cards.length === 0}
              />
            </MenuTargetView>
          </TopPartIf>
        )}
        {cards.length > 0 && (
          <TopPartIf
            top={message.attachments.length === 0 && body === undefined}
          >
            <LinkCards cards={cards} />
          </TopPartIf>
        )}
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
  const lift = useOwnLift(order);
  return (
    <Animated.View style={lift}>
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
          order={rowOrder(message.sentAt)}
          onEnd={setNameEnd}
        />
      )}
      {card !== undefined && (
        <View style={{ marginBottom: QUOTE_GAP }}>
          <QuoteBubble message={message} card={card} />
        </View>
      )}
      <InteractiveMessage
        message={message}
        align={isOwn ? "end" : "start"}
        shape="plain"
        reactionStyle="tapbacks"
        roomAbove={besideName ? NAME_HEIGHT : 0}
        tapbacksClearOf={besideName ? nameEnd : undefined}
      >
        <Content
          message={message}
          isOwn={isOwn}
          endsGroup={endsGroup}
          quoted={card !== undefined}
        />
      </InteractiveMessage>
      <NotSent message={message} />
      {card !== undefined && (
        <View style={replyIndent(isOwn)}>
          <ThreadFooter message={message} card={card} isOwn={isOwn} />
        </View>
      )}
      {replies !== undefined && (
        <RepliesFooter message={message} replies={replies} isOwn={isOwn} />
      )}
    </View>
  );
}

/** What sits above the bubble: the sender's name, and the tapbacks. */
function aboveBubble(message: Message, named: boolean) {
  const name = named ? NAME_HEIGHT : 0;
  const reacted = (message.reactions?.length ?? 0) > 0;
  return Math.max(name, reacted ? TAPBACK_SPACE : 0);
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
  const showAuthor = author !== undefined && !isOwn;
  return (
    <View className={startsGroup ? "pt-3.5" : "pt-1"}>
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
        top={aboveBubble(message, startsGroup && showAuthor)}
      />
    </View>
  );
}
