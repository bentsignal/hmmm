import type { Ref, RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useImperativeHandle, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MessageRow } from "./build-rows";
import type { Latest } from "./list-position";
import type { ProfileOf } from "./message-row";
import type { Message } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { SymbolIcon } from "~/components/symbol-icon";
import { buildMessageRows } from "./build-rows";
import { useLatest, usePlacement } from "./list-position";
import { MessageActionsProvider } from "./message-actions";
import { arrivedAfter, Row } from "./message-row";
import { useModalKeyboardFreeze } from "./modal-keyboard-freeze";
import { RevealTimes } from "./reveal";

function JumpToLatest({
  visible,
  bottom,
  onPress,
}: {
  visible: { value: boolean };
  /** Distance from the bottom edge, above the floating composer. */
  bottom: number;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible.value ? 1 : 0, { duration: 160 }),
    transform: [
      { scale: withTiming(visible.value ? 1 : 0.8, { duration: 160 }) },
    ],
  }));
  const props = useAnimatedProps(() => ({
    pointerEvents: visible.value ? ("auto" as const) : ("none" as const),
  }));
  return (
    <Animated.View
      animatedProps={props}
      className="absolute right-4"
      style={[{ bottom }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Jump to latest"
        onPress={onPress}
        className="bg-background-elevated border-hairline border-separator size-10 items-center justify-center rounded-full shadow-sm"
      >
        <SymbolIcon
          name={{ android: "keyboard_arrow_down", ios: "chevron.down" }}
          size={18}
          weight="semibold"
          tintColorClassName="accent-accent"
        />
      </Pressable>
    </Animated.View>
  );
}

/** What the conversation screen can ask of its list. */
export interface MessageListHandle {
  /** Scrolls down to the newest message, as after sending one. */
  scrollToLatest: () => void;
}

/** Rows newest first, as the inverted list lays them out from the bottom. */
function newestFirst(messages: readonly Message[], layout: MessageLayout) {
  return buildMessageRows(messages, layout).reverse();
}

interface RowsProps {
  listRef: RefObject<FlatList<MessageRow> | null>;
  messages: readonly Message[];
  self: string;
  layout: MessageLayout;
  profileOf: ProfileOf;
  showAuthors: boolean;
  anchorId?: string;
  hasNewer: boolean;
  onLoadOlder: () => void;
  onLoadNewer: () => void;
  bottomInset: number;
  topInset: number;
  /** Height of the composer floating over the bottom of the list. */
  composerHeight: number;
  latest: Latest;
  /** Freezes keyboard handling (see useModalKeyboardFreeze). */
  freeze: SharedValue<boolean>;
  /** The list is laid out at its starting place. */
  onReady: () => void;
}

/**
 * The messages, in a list that's inverted: it lays out from the newest
 * message up, so it opens at the bottom without scrolling there, and older
 * pages load past the top without moving anything on screen, since rows
 * are laid out in order and never placed at estimated spots first. Newer
 * messages arriving below keep their place with the native scroll anchor,
 * which also slides a new message into view when you're at the bottom.
 */
function Rows({
  listRef,
  messages,
  self,
  layout,
  profileOf,
  showAuthors,
  anchorId,
  hasNewer,
  onLoadOlder,
  onLoadNewer,
  bottomInset,
  topInset,
  composerHeight,
  latest,
  freeze,
  onReady,
}: RowsProps) {
  const safeArea = useSafeAreaInsets();
  const rows = newestFirst(messages, layout);
  // Only messages that arrive while open animate in, not loaded pages.
  const [openedAt] = useState(Date.now);
  const anchorIndex =
    anchorId === undefined ? -1 : rows.findIndex((row) => row.key === anchorId);
  const placement = usePlacement({
    anchorIndex,
    listRef,
    onLoadNewer,
    onReady,
  });
  return (
    <FlatList
      ref={listRef}
      inverted
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) => (
        <Row
          row={item}
          self={self}
          layout={layout}
          profileOf={profileOf}
          showAuthors={showAuthors}
          highlighted={item.key === anchorId}
          arriving={arrivedAfter(item, openedAt)}
        />
      )}
      renderScrollComponent={(props) => (
        <KeyboardChatScrollView
          {...props}
          inverted
          offset={bottomInset}
          freeze={freeze}
          onContentInsetChange={(insets) => latest.onInsetChange(insets.top)}
        />
      )}
      // Enough to fill the screen at once, and to reach the message it
      // opens on, so that one can be scrolled to before it shows.
      initialNumToRender={Math.max(20, anchorIndex + 15)}
      maxToRenderPerBatch={20}
      windowSize={15}
      // Newer messages (or a newer page) added below what's on screen keep
      // it in place. At the newest message, a new one then slides into view
      // (see useLatest).
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      // Inverted: the list's end is the oldest message, at the top.
      onEndReached={() => {
        if (placement.isPlaced()) onLoadOlder();
      }}
      onEndReachedThreshold={1}
      onStartReached={() => {
        if (placement.isPlaced()) onLoadNewer();
      }}
      onStartReachedThreshold={1}
      onScroll={(event) => latest.onScroll(event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={32}
      onContentSizeChange={() => {
        latest.onNewest(rows[0]?.key, !hasNewer);
        placement.onLaidOut();
      }}
      onScrollToIndexFailed={placement.onMissed}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      // Room under the newest message for the composer floating over it,
      // which grows as you type, and above the oldest for the header: the
      // messages scroll under both. Inverted, the list's header is at the
      // bottom of the screen and its footer at the top.
      ListHeaderComponent={<View style={{ height: composerHeight + 8 }} />}
      ListFooterComponent={
        <View style={{ height: safeArea.top + topInset + 8 }} />
      }
      scrollIndicatorInsets={{
        bottom: safeArea.top + topInset,
        top: composerHeight,
      }}
      style={{ flex: 1 }}
    />
  );
}

type MessageListProps = Omit<
  RowsProps,
  "freeze" | "latest" | "listRef" | "onReady"
> & {
  ref?: Ref<MessageListHandle>;
  onJumpToLatest: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  /** Opens the sheet of who reacted to a message. */
  onViewReactions: (messageId: string) => void;
};

/**
 * The conversation, newest at the bottom, with its long-press menu, drag
 * to see times, and a button back down to the latest message. Opens on
 * `anchorId` when given.
 */
export function MessageList({
  ref,
  onJumpToLatest,
  onToggleReaction,
  onViewReactions,
  ...props
}: MessageListProps) {
  const listRef = useRef<FlatList<MessageRow>>(null);
  // Covered until laid out at its starting place, then faded in. A
  // page-colored cover fades away rather than the list fading in: glass
  // created under a fully transparent parent never draws.
  const loaded = useSharedValue(0);
  const cover = useAnimatedStyle(() => ({ opacity: 1 - loaded.value }));
  const latest = useLatest(listRef);
  const { isNearLatest, scrollToLatest, scrollToNewest } = latest;
  // Read out first: the worklet must not capture `props` (messages hold
  // Dates, which worklets can't copy).
  const { hasNewer } = props;
  const showJump = useDerivedValue(() => hasNewer || !isNearLatest.value);
  const keyboard = useModalKeyboardFreeze();

  useImperativeHandle(ref, () => ({ scrollToLatest }));

  return (
    <MessageActionsProvider
      onToggleReaction={onToggleReaction}
      onViewReactions={onViewReactions}
      // The menu is a modal, which would otherwise scroll the list on
      // Android (see useModalKeyboardFreeze).
      onMenuChange={keyboard.hold}
    >
      <RevealTimes>
        <View style={{ flex: 1 }}>
          <Rows
            {...props}
            listRef={listRef}
            latest={latest}
            freeze={keyboard.freeze}
            onReady={() => {
              // A frame later, once the first scroll (to the message it
              // opened on) has drawn.
              requestAnimationFrame(() => {
                loaded.set(withTiming(1, { duration: 220 }));
              });
            }}
          />
        </View>
      </RevealTimes>
      <Animated.View
        pointerEvents="none"
        className="bg-background absolute inset-0"
        style={cover}
      />
      <JumpToLatest
        visible={showJump}
        bottom={props.composerHeight + 12}
        onPress={() => {
          if (hasNewer) onJumpToLatest();
          else scrollToNewest();
        }}
      />
    </MessageActionsProvider>
  );
}
