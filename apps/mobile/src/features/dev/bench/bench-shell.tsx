import type { ReactNode, Ref } from "react";
import type { ScrollViewProps } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";
import { createContext, use } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedRef,
  useSharedValue,
} from "react-native-reanimated";

import type { MessageRow } from "~/features/conversation/build-rows";
import type { MessageLayout } from "~/features/preferences/store";
import { GrowthProvider } from "~/features/conversation/grow";
import { MessageActionsProvider } from "~/features/conversation/message-actions";
import { Row, RowContent } from "~/features/conversation/message-row";
import { RevealTimes } from "~/features/conversation/reveal";
import { useTypingDrop } from "~/features/conversation/typing-drop";
import { BENCH_SELF, benchProfileOf } from "./synthetic";

// What every list in the benchmark shares (see `bench.tsx`): the context
// the conversation's rows render in, the rows themselves as the
// conversation renders them, and a scroll view the benchmark can scroll on
// the UI thread, as a finger would, whatever JavaScript is doing.

/** The benchmark's scroll view, for `scrollTo` on the UI thread. */
const ScrollRefContext = createContext<AnimatedRef<Animated.ScrollView> | null>(
  null,
);

/**
 * The scroll view each list renders, with the benchmark's animated ref
 * alongside the list's own.
 */
export function BenchScrollView({
  ref,
  ...props
}: ScrollViewProps & { ref?: Ref<Animated.ScrollView> }) {
  const scrollRef = use(ScrollRefContext);
  return (
    <Animated.ScrollView
      {...props}
      ref={(node: Animated.ScrollView | null) => {
        scrollRef?.(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
    />
  );
}

function noop() {
  return undefined;
}

/**
 * The context the conversation's rows need: the message actions, times
 * revealed by a drag, and rows that grow (none do here).
 */
export function BenchShell({
  scrollRef,
  children,
}: {
  scrollRef: AnimatedRef<Animated.ScrollView>;
  children: ReactNode;
}) {
  const frame = useAnimatedRef<View>();
  const composer = useSharedValue(0);
  const typingDrop = useTypingDrop({
    blankSpace: undefined,
    composer,
    keyboardOffset: 0,
  });
  return (
    <ScrollRefContext value={scrollRef}>
      <MessageActionsProvider onToggleReaction={noop} onViewReactions={noop}>
        <RevealTimes>
          <View ref={frame} style={{ flex: 1 }}>
            <GrowthProvider list={frame} typingDrop={typingDrop}>
              {children}
            </GrowthProvider>
          </View>
        </RevealTimes>
      </MessageActionsProvider>
    </ScrollRefContext>
  );
}

/** How much of a row the benchmark renders. */
export type BenchRows = "content" | "full" | "plain";

/**
 * One of the conversation's rows, as it renders when nothing animates
 * (`full`), without the layer that moves it (`content`), or as plain text
 * (`plain`), for how much of the cost is the row.
 */
export function BenchRow({
  row,
  layout,
  rows = "full",
}: {
  row: MessageRow;
  layout: MessageLayout;
  rows?: BenchRows;
}) {
  if (rows === "plain") {
    return (
      <View className="px-4 py-1">
        <Text className="text-body text-foreground">
          {row.type === "message" ? (row.message.body ?? "Photo") : row.key}
        </Text>
      </View>
    );
  }
  if (rows === "content") {
    return (
      <RowContent
        row={row}
        self={BENCH_SELF}
        layout={layout}
        profileOf={benchProfileOf}
        showAuthors
      />
    );
  }
  return (
    <Row
      row={row}
      self={BENCH_SELF}
      layout={layout}
      profileOf={benchProfileOf}
      showAuthors
      highlighted={false}
      arriving={false}
      becoming={undefined}
      leaving={undefined}
      onFaded={noop}
      onClosed={noop}
    />
  );
}
