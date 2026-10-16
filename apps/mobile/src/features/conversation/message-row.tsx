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
import type { MessageLayout } from "~/features/preferences/store";
import { Arrive } from "./arrive";
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
    <RowShell rowKey={row.key} highlighted={highlighted} arriving={arriving}>
      <RowContent
        row={row}
        self={self}
        layout={layout}
        profileOf={profileOf}
        showAuthors={showAuthors}
      />
    </RowShell>
  );
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
