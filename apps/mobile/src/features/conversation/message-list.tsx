import type { Ref, RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useImperativeHandle, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import type { MessageRow } from "./build-rows";
import type { Latest } from "./list-position";
import type { ProfileOf } from "./message-row";
import type { Message } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { GlassSurface } from "~/components/glass-surface";
import { SymbolIcon } from "~/components/symbol-icon";
import { cn } from "~/lib/cn";
import { arrivedAfter, buildMessageRows } from "./build-rows";
import { useLatest, usePlacement } from "./list-position";
import { MessageActionsProvider } from "./message-actions";
import { Row } from "./message-row";
import { useModalKeyboardFreeze } from "./modal-keyboard-freeze";
import { RevealTimes } from "./reveal";

/** The jump button's size. */
const JUMP_SIZE = 40;

function JumpChevron() {
  return (
    <SymbolIcon
      name={{ android: "keyboard_arrow_down", ios: "chevron.down" }}
      size={17}
      weight="semibold"
      tintColorClassName="accent-foreground"
    />
  );
}

/**
 * Back down to the newest message, once you've scrolled away from it. On
 * iOS a Liquid Glass circle that materializes and dissolves like the
 * system's own controls (glass can't fade, see `GlassSurface`); a plain
 * raised circle on Android.
 */
function JumpToLatest({
  visible,
  bottom,
  onPress,
}: {
  visible: SharedValue<boolean>;
  /** Distance from the bottom edge, above the floating composer. */
  bottom: number;
  onPress: () => void;
}) {
  const [shown, setShown] = useState(false);
  useAnimatedReaction(
    () => visible.value,
    (now, before) => {
      if (now !== before) scheduleOnRN(setShown, now);
    },
  );
  const chevron = useAnimatedStyle(() => ({
    opacity: withTiming(visible.value ? 1 : 0, { duration: 160 }),
    transform: [
      { scale: withTiming(visible.value ? 1 : 0.6, { duration: 200 }) },
    ],
  }));
  return (
    <View
      pointerEvents={shown ? "box-none" : "none"}
      className="absolute right-4"
      style={{ bottom }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Jump to latest"
        accessibilityElementsHidden={!shown}
        onPress={onPress}
        hitSlop={6}
      >
        <GlassSurface
          isInteractive
          shown={shown}
          className="items-center justify-center rounded-full"
          androidClassName={cn(
            "bg-background-elevated border-hairline border-separator shadow-sm",
            !shown && "opacity-0",
          )}
          style={{ height: JUMP_SIZE, width: JUMP_SIZE }}
        >
          <Animated.View style={chevron}>
            <JumpChevron />
          </Animated.View>
        </GlassSurface>
      </Pressable>
    </View>
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
  /** Space below the composer that the keyboard covers when it opens. */
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

/** Messages in a page (`MESSAGE_PAGE_SIZE`), plus room for headers. */
const PAGE_ROWS = 60;

/**
 * The messages, in a list that's inverted: it lays out from the newest
 * message up, so it opens at the bottom without scrolling there, and older
 * pages load past the top without moving anything on screen, since rows
 * are laid out in order and never placed at estimated spots first. At the
 * bottom it stays there as messages arrive; scrolled up, what you're
 * reading stays still (see `useLatest`).
 */
function Rows({
  listRef,
  messages,
  self,
  layout,
  profileOf,
  showAuthors,
  anchorId,
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
      // opens on, so that one can be scrolled to before it shows. A page
      // that loads renders all at once, so the list grows (and the scroll
      // bar moves) once per page, not once per batch.
      initialNumToRender={Math.max(20, anchorIndex + 15)}
      maxToRenderPerBatch={PAGE_ROWS}
      windowSize={21}
      // Scrolled up, newer messages (or a newer page) added below what's
      // on screen leave it where it is. At the bottom there's no anchor,
      // so the list stays on the newest message (see useLatest).
      maintainVisibleContentPosition={
        latest.pinned ? undefined : { minIndexForVisible: 0 }
      }
      // Inverted: the list's end is the oldest message, at the top. Older
      // ones load three screens early, so a fast scroll rarely reaches
      // the top before they're there.
      onEndReached={() => {
        if (placement.isPlaced()) onLoadOlder();
      }}
      onEndReachedThreshold={3}
      onStartReached={() => {
        if (placement.isPlaced()) onLoadNewer();
      }}
      onStartReachedThreshold={3}
      onScroll={(event) => latest.onScroll(event.nativeEvent.contentOffset.y)}
      {...latest.scrollHandlers}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        latest.onNewest(rows[0]?.key);
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
  /** Opens the sheet of who reacted to a message, on one emoji if given. */
  onViewReactions: (messageId: string, emoji?: string) => void;
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
  const latest = useLatest(listRef, props.anchorId === undefined);
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
