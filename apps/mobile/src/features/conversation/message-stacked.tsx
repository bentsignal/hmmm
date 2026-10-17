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
import { MenuTargetView } from "./message-actions";
import { InteractiveMessage } from "./message-reactions";
import { NotSent, SendingFade, SENT_FADE_MS } from "./message-status";
import { linkCardsOf, visibleBody } from "./message-text";
import { QuoteLine, RepliesFooter, ThreadFooter } from "./reply-card";

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
  const body = visibleBody(message);
  const cards = linkCardsOf(message);
  return (
    <View
      className={cn(
        "flex-row gap-3 px-4",
        card !== undefined || !startsGroup ? "pt-1.5" : "pt-5",
      )}
    >
      <View style={{ width: AVATAR_COLUMN }}>
        {startsGroup && (
          <AuthorLink
            address={message.authorId}
            name={author.displayName}
            repeated
          >
            <Avatar
              name={author.displayName}
              size="row"
              uri={author.avatarUrl}
            />
          </AuthorLink>
        )}
      </View>
      <View className="flex-1 gap-1">
        {startsGroup && (
          <View className="flex-row items-baseline gap-2">
            <AuthorLink address={message.authorId} name={author.displayName}>
              <Text className="text-subhead text-foreground font-semibold">
                {author.displayName}
              </Text>
            </AuthorLink>
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
        >
          <SendingFade status={message.status}>
            <View className="items-start gap-1">
              {body !== undefined && (
                <MenuTargetView>
                  <LinkedText
                    text={body}
                    mentions={message.mentions}
                    className="text-body text-foreground"
                  />
                </MenuTargetView>
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
          </SendingFade>
          {/* Reactions go under the thread's count. */}
          {card !== undefined && <ThreadFooter message={message} card={card} />}
          {replies !== undefined && (
            <RepliesFooter message={message} replies={replies} />
          )}
        </InteractiveMessage>
        <NotSent message={message} />
      </View>
    </View>
  );
}
