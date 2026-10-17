import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import type { MessageRow } from "./build-rows";
import type { ReplyCard, ThreadReplies } from "./reply-card";
import type { Message } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { Arrive } from "./arrive";
import { rowOrder } from "./build-rows";
import { DaySeparator, TimeHeader } from "./day-separator";
import { useRowLift } from "./grow";
import { MemberNotice } from "./member-notice";
import { MessageBubble } from "./message-bubble";
import { MessageStacked } from "./message-stacked";
import { RepliesDivider } from "./replies-divider";
import { MessageRowTarget } from "./row-target";

export type ProfileOf = (address: string) => {
  avatarUrl: string | null;
  displayName: string;
};

/** Fades a tint behind the message a conversation opened on. */
function Highlight({ children }: { children: ReactNode }) {
  const tint = useSharedValue(1);
  useAnimatedReaction(
    () => true,
    (_, previous) => {
      if (previous === null)
        tint.set(withDelay(800, withTiming(0, { duration: 1600 })));
    },
  );
  // The tint's opacity fades, not its color: a color string built from a
  // tiny number ("5e-16") is invalid, and Android's Reanimated throws on it.
  const style = useAnimatedStyle(() => ({ opacity: 0.18 * tint.value }));
  return (
    <View>
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0"
        style={[{ backgroundColor: "rgb(124, 124, 255)" }, style]}
      />
      {children}
    </View>
  );
}

interface RowProps {
  row: MessageRow;
  self: string;
  layout: MessageLayout;
  profileOf: ProfileOf;
  showAuthors: boolean;
}

/**
 * One row of the list. Its props are passed on one by one, not spread:
 * a spread makes a new object each render, so the React Compiler couldn't
 * tell the row is unchanged and every row on screen would redraw whenever
 * the list did.
 */
export function Row({
  row,
  self,
  layout,
  profileOf,
  showAuthors,
  highlighted,
  arriving,
}: RowProps & { highlighted: boolean; arriving: boolean }) {
  return (
    <RowLift
      order={orderOf(row)}
      // Stacked rows' reactions open below the message, so the row itself
      // moves up as they do.
      withOwn={layout === "stacked"}
    >
      <RowShell rowKey={row.key} highlighted={highlighted} arriving={arriving}>
        <RowContent
          row={row}
          self={self}
          layout={layout}
          profileOf={profileOf}
          showAuthors={showAuthors}
        />
      </RowShell>
    </RowLift>
  );
}

/** Where a row sits in the list (see `rowOrder`). */
function orderOf(row: MessageRow) {
  if (row.type === "message") return rowOrder(row.message.sentAt);
  if (row.type === "notice") return rowOrder(row.notice.at);
  // A thread's divider sits just after its original.
  if (row.type === "replies") return rowOrder(row.date) + 0.25;
  return rowOrder(row.date, true);
}

/** Moves the row with the rows above a row that grows (see `useRowLift`). */
function RowLift({
  order,
  withOwn,
  children,
}: {
  order: number;
  withOwn: boolean;
  children: ReactNode;
}) {
  const lift = useRowLift(order, withOwn);
  return <Animated.View style={lift}>{children}</Animated.View>;
}

/**
 * What wraps a row: the tint behind the message the conversation opened on,
 * and the arrival of a row that came in while it's open.
 */
function RowShell({
  rowKey,
  highlighted,
  arriving,
  children,
}: {
  rowKey: string;
  highlighted: boolean;
  arriving: boolean;
  children: ReactNode;
}) {
  if (arriving) {
    return (
      <Arrive rowKey={rowKey}>
        <RowShell rowKey={rowKey} highlighted={highlighted} arriving={false}>
          {children}
        </RowShell>
      </Arrive>
    );
  }
  return highlighted ? <Highlight>{children}</Highlight> : children;
}

function personOf(address: string, profileOf: ProfileOf) {
  return { address, ...profileOf(address) };
}

/** What a reply shows around it in the conversation. */
function replyCard(message: Message, profileOf: ProfileOf) {
  if (message.quote === undefined) return undefined;
  const repliers = message.thread?.repliers ?? [];
  return {
    more: (message.thread?.replyCount ?? 1) - 1,
    quote: message.quote,
    quoteAuthor: personOf(message.quote.authorId, profileOf),
    repliers: repliers.map((address) => personOf(address, profileOf)),
  } satisfies ReplyCard;
}

/** What a thread's original shows under it in the conversation. */
function threadReplies(message: Message, profileOf: ProfileOf) {
  if (message.threadId !== undefined || message.thread === undefined) {
    return undefined;
  }
  return {
    count: message.thread.replyCount,
    repliers: message.thread.repliers.map((address) =>
      personOf(address, profileOf),
    ),
  } satisfies ThreadReplies;
}

function RowContent({ row, self, layout, profileOf, showAuthors }: RowProps) {
  const stacked = layout === "stacked";
  if (row.type === "day") {
    return <DaySeparator date={row.date} stacked={stacked} />;
  }
  if (row.type === "time") {
    return <TimeHeader date={row.date} stacked={stacked} />;
  }
  if (row.type === "replies") {
    return <RepliesDivider count={row.count} />;
  }
  if (row.type === "notice") {
    return (
      <MemberNotice
        notice={row.notice}
        stacked={stacked}
        followsNotice={row.followsNotice}
      />
    );
  }
  const { message } = row;
  const card = replyCard(message, profileOf);
  const replies = threadReplies(message, profileOf);
  return (
    <MessageRowTarget message={message}>
      {stacked ? (
        <MessageStacked
          message={message}
          author={profileOf(message.authorId)}
          startsGroup={row.startsGroup}
          endsGroup={row.endsGroup}
          card={card}
          replies={replies}
        />
      ) : (
        <MessageBubble
          message={message}
          isOwn={message.authorId === self}
          author={showAuthors ? profileOf(message.authorId) : undefined}
          startsGroup={row.startsGroup}
          endsGroup={row.endsGroup}
          card={card}
          replies={replies}
        />
      )}
    </MessageRowTarget>
  );
}
