import type { RefObject } from "react";
import { useRef } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import { Avatar } from "~/components/avatar";
import { cn } from "~/lib/cn";
import { formatTime } from "~/lib/format";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { AuthorLink } from "./author-link";
import { LinkCards } from "./link-preview-card";
import { LinkedText } from "./linked-text";
import { useMessageActions, useSqueeze } from "./message-actions";
import { InteractiveMessage } from "./message-reactions";
import { NotSent, SendingFade, SENT_FADE_MS } from "./message-status";
import { linkCardsOf, visibleBody } from "./message-text";
import { QuoteLine, RepliesFooter, ThreadFooter } from "./reply-card";
import { useRowTarget } from "./row-touch";

const AVATAR_COLUMN = 36;

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
  return (
    <View style={{ width: AVATAR_COLUMN }}>
      {startsGroup && (
        <AuthorLink
          address={message.authorId}
          name={author.displayName}
          repeated
        >
          <Avatar name={author.displayName} size="row" uri={author.avatarUrl} />
        </AuthorLink>
      )}
    </View>
  );
}

/** The sender's name and the time, above the first message of a run. */
function NameLine({ message, author }: { message: Message; author: Author }) {
  return (
    <View className="flex-row items-baseline gap-2">
      <AuthorLink address={message.authorId} name={author.displayName}>
        <Text className="text-subhead text-foreground font-semibold">
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

/** The message itself: its text, photos and files, and link cards. */
function Content({ message }: { message: Message }) {
  const body = visibleBody(message);
  const cards = linkCardsOf(message);
  return (
    <View className="items-start gap-1">
      {body !== undefined && (
        <LinkedText
          text={body}
          mentions={message.mentions}
          className="text-body text-foreground"
        />
      )}
      {message.attachments.map((attachment) => (
        <AttachmentView
          key={attachmentKey(attachment)}
          attachment={attachment}
          sending={message.status === "sending"}
        />
      ))}
      {cards.length > 0 && <LinkCards cards={cards} />}
    </View>
  );
}

/**
 * What a hold or double tap on the row lifts: the photo and name, and the
 * message, across the row, laid out as in the list.
 */
function Lifted({
  message,
  author,
  startsGroup,
}: {
  message: Message;
  author: Author;
  startsGroup: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <AvatarSlot message={message} author={author} startsGroup={startsGroup} />
      <View className="flex-1 gap-1">
        {startsGroup && <NameLine message={message} author={author} />}
        <Content message={message} />
      </View>
    </View>
  );
}

/**
 * Lifts the row from the top of its photo and name to the bottom of the
 * message (not its thread's count or reactions) with its menu when it's
 * held or double tapped anywhere but on a photo or link card, which lift
 * themselves, and squeezes it while held. Returns the squeeze's style.
 */
function useLiftRow({
  message,
  author,
  startsGroup,
  row,
  content,
}: {
  message: Message;
  author: Author;
  startsGroup: boolean;
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
          preview: (
            <Lifted
              message={message}
              author={author}
              startsGroup={startsGroup}
            />
          ),
          rect: { height: top + height, width, x, y },
          shape: "card",
        });
      });
    });
  }
  useRowTarget({
    lift,
    pressIn: squeeze.pressIn,
    release: squeeze.release,
  });
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
  const squeeze = useLiftRow({ author, content, message, row, startsGroup });
  return (
    <View
      className={cn(
        "px-4",
        card !== undefined || !startsGroup ? "pt-1.5" : "pt-5",
      )}
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
            <InteractiveMessage
              message={message}
              align="start"
              shape="card"
              reactionStyle="chips"
            >
              <View ref={content}>
                <SendingFade status={message.status}>
                  <Content message={message} />
                </SendingFade>
              </View>
              {/* Reactions go under the thread's count. */}
              {card !== undefined && (
                <ThreadFooter message={message} card={card} />
              )}
              {replies !== undefined && (
                <RepliesFooter message={message} replies={replies} />
              )}
            </InteractiveMessage>
            <NotSent message={message} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
