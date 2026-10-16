import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import type { Message, Quote } from "./types";
import { Avatar } from "~/components/avatar";
import { cn } from "~/lib/cn";
import { useMessageActions } from "./message-actions";
import { quoteText, REPLY_INDENT } from "./reply-parts";

// A thread's first reply, as the conversation shows it: the message it
// answers, small, with a curve from under it down into the reply, and how
// many more replies the thread has. Tapping any of it opens the thread.

/** Someone the card names or shows. */
export interface Person {
  readonly address: string;
  readonly avatarUrl: string | null;
  readonly displayName: string;
}

/** What a reply card shows besides the reply itself. */
export interface ReplyCard {
  /** What it shows of the message it answers. */
  readonly quote: Quote;
  /** Who wrote the message it answers. */
  readonly quoteAuthor: Person;
  /** The thread's other replies. */
  readonly more: number;
  /** Who wrote the thread's newest replies. */
  readonly repliers: readonly Person[];
}


/** Where the curve leaves the quote, from the quote's edge. */
const CURVE_INSET = 12;
/** The curve's line. */
const CURVE_WIDTH = 2;
/** How far down the reply's first line the curve ends. */
const CURVE_END = 19;
/** The gap between the quote and the reply. */
export const QUOTE_GAP = 4;
/** Most repliers' photos the footer shows. */
const FOOTER_FACES = 3;

/** Opens the reply's thread when pressed. */
function ThreadLink({
  message,
  label,
  className,
  children,
}: {
  message: Message;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { openThread } = useMessageActions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={openThread === undefined}
      onPress={() => openThread?.(message)}
      className={cn("active:opacity-60", className)}
    >
      {children}
    </Pressable>
  );
}

/** The message a reply answers, small and quiet, above the reply. */
export function QuoteBubble({
  message,
  card: { quote, quoteAuthor: author },
}: {
  message: Message;
  card: ReplyCard;
}) {
  return (
    <ThreadLink
      message={message}
      label={`Reply to ${author.displayName}, open thread`}
      className="border-separator max-w-full rounded-[16px] border px-3 py-1.5"
    >
      <Text
        numberOfLines={1}
        className="text-caption text-muted font-semibold"
      >
        {author.displayName}
      </Text>
      <Text numberOfLines={2} className="text-footnote text-muted">
        {quoteText(quote)}
      </Text>
    </ThreadLink>
  );
}

/**
 * The curve from under the quote's corner down into the reply bubble. It
 * sits in the reply's indent (`REPLY_INDENT`) and reaches up across
 * `above`, the space between them, which grows when tapbacks need room.
 */
export function ReplyCurve({
  isOwn,
  above,
}: {
  isOwn: boolean;
  above: number;
}) {
  const side = isOwn
    ? {
        borderBottomRightRadius: 12,
        borderRightWidth: CURVE_WIDTH,
        right: CURVE_INSET,
      }
    : {
        borderBottomLeftRadius: 12,
        borderLeftWidth: CURVE_WIDTH,
        left: CURVE_INSET,
      };
  return (
    <View
      pointerEvents="none"
      className="border-separator absolute"
      style={[
        side,
        {
          borderBottomWidth: CURVE_WIDTH,
          height: above + CURVE_END,
          top: -above,
          width: REPLY_INDENT - CURVE_INSET - 3,
        },
      ]}
    />
  );
}


/**
 * Stacked rows' quote, Discord-style: a curve from the reply's photo up
 * to a line naming the original's author and its start.
 */
export function QuoteLine({
  message,
  card: { quote, quoteAuthor: author },
  avatarColumn,
}: {
  message: Message;
  card: ReplyCard;
  /** The width of the reply's photo column, whose middle the curve leaves. */
  avatarColumn: number;
}) {
  return (
    <View className="flex-row items-end px-4 pt-4">
      <View
        className="border-separator"
        style={{
          borderLeftWidth: CURVE_WIDTH,
          borderTopLeftRadius: 10,
          borderTopWidth: CURVE_WIDTH,
          height: 12,
          marginBottom: -4,
          marginLeft: avatarColumn / 2 - CURVE_WIDTH / 2,
          width: avatarColumn / 2 + 4,
        }}
      />
      <ThreadLink
        message={message}
        label={`Reply to ${author.displayName}, open thread`}
        className="shrink flex-row items-center gap-1.5 pl-1"
      >
        <Avatar name={author.displayName} size="xs" uri={author.avatarUrl} />
        <Text
          numberOfLines={1}
          className="text-footnote text-muted shrink"
        >
          <Text className="font-semibold">{author.displayName}</Text>{" "}
          {quoteText(quote)}
        </Text>
      </ThreadLink>
    </View>
  );
}

/** "View 4 more replies", with the newest repliers' photos. */
export function ThreadFooter({
  message,
  card,
  isOwn = false,
}: {
  message: Message;
  card: ReplyCard;
  isOwn?: boolean;
}) {
  if (card.more <= 0) return null;
  const label = `View ${card.more} more ${card.more === 1 ? "reply" : "replies"}`;
  return (
    <ThreadLink
      message={message}
      label={label}
      className={cn(
        "flex-row items-center gap-1.5 pt-1",
        isOwn && "flex-row-reverse",
      )}
    >
      <View className="flex-row">
        {card.repliers.slice(0, FOOTER_FACES).map((person, index) => (
          <View
            key={person.address}
            className="border-background rounded-full border"
            style={{ marginLeft: index === 0 ? 0 : -6 }}
          >
            <Avatar name={person.displayName} size="xs" uri={person.avatarUrl} />
          </View>
        ))}
      </View>
      <Text className="text-footnote text-accent font-semibold">{label}</Text>
    </ThreadLink>
  );
}
