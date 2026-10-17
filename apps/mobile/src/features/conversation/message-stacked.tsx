import type { RefObject } from "react";
import { useRef } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import { Avatar } from "~/components/avatar";
import { cn } from "~/lib/cn";
import { formatTime } from "~/lib/format";
import { AuthorLink } from "./author-link";
import { useMessageActions, useSqueeze } from "./message-actions";
import { lastPart, partCount } from "./message-parts";
import { InteractiveMessage } from "./message-reactions";
import { NotSent, SendingFade, SENT_FADE_MS } from "./message-status";
import { StillChips } from "./part-chips";
import { QuoteBlock, QuoteLine } from "./reply-card";
import { useRowTarget } from "./row-touch";
import { avatarColumn, GroupFrame, rowInset } from "./stacked-frame";
import { StackedFooter, StackedParts } from "./stacked-parts";
import { useStackedStyle } from "./stacked-style";

/**
 * Slack/Discord-style: everyone left-aligned with a photo and name. A
 * reply has a line quoting the message it answers above it (see
 * `ReplyCard`), and a thread's original its count under it.
 */
export function MessageStacked({
  message,
  author,
  startsGroup,
  endsGroup,
  card,
  replies,
}: {
  message: Message;
  author: { avatarUrl: string | null; displayName: string };
  startsGroup: boolean;
  endsGroup: boolean;
  /** Set for a reply in the conversation. */
  card?: ReplyCard;
  /** Set for a thread's original in the conversation. */
  replies?: ThreadReplies;
}) {
  const style = useStackedStyle();
  const quoteAbove = card !== undefined && style.quote === "curve";
  return (
    <GroupFrame
      opens={startsGroup || card !== undefined}
      closes={endsGroup}
      quoteAbove={quoteAbove}
    >
      {quoteAbove && (
        <View style={{ paddingHorizontal: rowInset(style) }}>
          <QuoteLine
            message={message}
            card={card}
            avatarColumn={avatarColumn(style)}
          />
        </View>
      )}
      <StackedRow
        message={message}
        author={author}
        startsGroup={startsGroup}
        card={card}
        replies={replies}
      />
    </GroupFrame>
  );
}

interface Author {
  avatarUrl: string | null;
  displayName: string;
}

/** The sender's photo, beside the first message of a run. */
function AvatarSlot({
  message,
  author,
  startsGroup,
}: {
  message: Message;
  author: Author;
  startsGroup: boolean;
}) {
  const style = useStackedStyle();
  return (
    <View style={{ width: avatarColumn(style) }}>
      {startsGroup && (
        <AuthorLink
          address={message.authorId}
          name={author.displayName}
          repeated
        >
          <Avatar
            name={author.displayName}
            size={style.bigAvatar ? "rowLarge" : "row"}
            uri={author.avatarUrl}
          />
        </AuthorLink>
      )}
    </View>
  );
}

/** The sender's name and the time, above the first message of a run. */
function NameLine({ message, author }: { message: Message; author: Author }) {
  const { bigNames } = useStackedStyle();
  return (
    <View className="flex-row items-baseline gap-2">
      <AuthorLink address={message.authorId} name={author.displayName}>
        <Text
          className={cn(
            "text-foreground font-semibold",
            bigNames ? "text-body" : "text-subhead",
          )}
        >
          {author.displayName}
        </Text>
      </AuthorLink>
      {/* Always laid out, so the name never shifts; it fades in once the
          message is sent. */}
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
  );
}

/**
 * What a hold or double tap on the row lifts: the photo and name, and the
 * message, across the row, laid out as in the list, with the chips under
 * its parts (not the last one's, under its thread's count).
 */
function Lifted({
  message,
  author,
  startsGroup,
  card,
}: {
  message: Message;
  author: Author;
  startsGroup: boolean;
  card?: ReplyCard;
}) {
  const { quote } = useStackedStyle();
  return (
    <View className="flex-row gap-3">
      <AvatarSlot message={message} author={author} startsGroup={startsGroup} />
      <View className="flex-1 gap-1">
        {startsGroup && <NameLine message={message} author={author} />}
        {card !== undefined && quote === "block" && (
          <QuoteBlock message={message} card={card} />
        )}
        <StillChips
          reactions={message.reactions ?? []}
          chipsAtEnd={lastPart(message)}
        >
          <StackedParts message={message} />
        </StillChips>
      </View>
    </View>
  );
}

/**
 * Lifts the row from the top of its photo and name to the bottom of the
 * message (not its thread's count or reactions) with its menu when it's
 * held or double tapped anywhere but on a photo or link card, which lift
 * themselves, and squeezes it while held. Reactions picked there go to the
 * message (its text). A message of several parts lifts whole only from
 * its photo and name: its text lifts on its own, and beside a part, that
 * part lifts. Returns the squeeze's style.
 */
function useLiftRow({
  message,
  author,
  startsGroup,
  card,
  row,
  content,
}: {
  message: Message;
  author: Author;
  startsGroup: boolean;
  card?: ReplyCard;
  /** The row's photo and name, and its message, without the padding. */
  row: RefObject<View | null>;
  /** The message, whose bottom is the lifted row's. */
  content: RefObject<View | null>;
}) {
  const { open } = useMessageActions();
  const squeeze = useSqueeze();
  function lift() {
    const measured = row.current;
    if (measured === null) return;
    measured.measureInWindow((x, y, width) => {
      // Where the message ends in the row, laid out: the squeeze inside
      // the row doesn't move it.
      content.current?.measureLayout(measured, (_x, top, _width, height) => {
        open({
          align: "start",
          message,
          mode: "actions",
          part: "message",
          preview: (
            <Lifted
              message={message}
              author={author}
              startsGroup={startsGroup}
              card={card}
            />
          ),
          rect: { height: top + height, width, x, y },
          shape: "card",
        });
      });
    });
  }
  useRowTarget(
    { lift, pressIn: squeeze.pressIn, release: squeeze.release },
    partCount(message) > 1 ? "across" : undefined,
  );
  return squeeze.style;
}

function StackedRow({
  message,
  author,
  startsGroup,
  card,
  replies,
}: {
  message: Message;
  author: Author;
  startsGroup: boolean;
  /** A reply card's, under its quote, which leaves the space above it. */
  card?: ReplyCard;
  replies?: ThreadReplies;
}) {
  const row = useRef<View>(null);
  const content = useRef<View>(null);
  const style = useStackedStyle();
  const squeeze = useLiftRow({
    author,
    card,
    content,
    message,
    row,
    startsGroup,
  });
  const chipsAtEnd = lastPart(message);
  const quoteInside = card !== undefined && style.quote === "block";
  return (
    <View
      style={{
        paddingHorizontal: rowInset(style),
        // Under the quote line above it.
        paddingTop: card !== undefined && !quoteInside ? 6 : 0,
      }}
    >
      <View ref={row}>
        <Animated.View className="flex-row gap-3" style={squeeze}>
          <AvatarSlot
            message={message}
            author={author}
            startsGroup={startsGroup}
          />
          <View className="flex-1 gap-1">
            {startsGroup && <NameLine message={message} author={author} />}
            {quoteInside && <QuoteBlock message={message} card={card} />}
            <InteractiveMessage
              message={message}
              align="start"
              shape="card"
              reactionStyle="chips"
              // The last part's reactions go under the thread's count.
              chipsAtEnd={chipsAtEnd}
              inner={partCount(message) > 1}
            >
              <View ref={content}>
                <SendingFade status={message.status}>
                  <StackedParts message={message} />
                </SendingFade>
              </View>
              <StackedFooter message={message} card={card} replies={replies} />
            </InteractiveMessage>
            <NotSent message={message} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
