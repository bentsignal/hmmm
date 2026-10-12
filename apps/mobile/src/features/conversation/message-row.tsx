import type { ReactNode } from "react";
import Animated, {
  FadeIn,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import type { MessageRow } from "./build-rows";
import type { MessageLayout } from "~/features/preferences/store";
import { DaySeparator, TimeHeader } from "./day-separator";
import { MessageBubble } from "./message-bubble";
import { MessageStacked } from "./message-stacked";

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
        tint.value = withDelay(800, withTiming(0, { duration: 1600 }));
    },
  );
  const style = useAnimatedStyle(() => ({
    backgroundColor: `rgba(124, 124, 255, ${0.18 * tint.value})`,
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

interface RowProps {
  row: MessageRow;
  self: string;
  layout: MessageLayout;
  profileOf: ProfileOf;
  showAuthors: boolean;
}

/**
 * New rows fade in while the list slides them up into view; the list's
 * own scroll is the motion, so the row doesn't move on its own too.
 */
const ARRIVE = FadeIn.duration(260);

export function Row({
  highlighted,
  arriving,
  ...props
}: RowProps & { highlighted: boolean; arriving: boolean }) {
  const content = highlighted ? (
    <Highlight>
      <RowContent {...props} />
    </Highlight>
  ) : (
    <RowContent {...props} />
  );
  return (
    <Animated.View entering={arriving ? ARRIVE : undefined}>
      {content}
    </Animated.View>
  );
}

function RowContent({ row, self, layout, profileOf, showAuthors }: RowProps) {
  const stacked = layout === "stacked";
  if (row.type === "day") {
    return <DaySeparator date={row.date} stacked={stacked} />;
  }
  if (row.type === "time") {
    return <TimeHeader date={row.date} stacked={stacked} />;
  }
  const { message } = row;
  if (stacked) {
    return (
      <MessageStacked
        message={message}
        author={profileOf(message.authorId)}
        startsGroup={row.startsGroup}
      />
    );
  }
  return (
    <MessageBubble
      message={message}
      isOwn={message.authorId === self}
      author={showAuthors ? profileOf(message.authorId) : undefined}
      startsGroup={row.startsGroup}
      endsGroup={row.endsGroup}
    />
  );
}
