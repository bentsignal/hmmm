import type { Ref, RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useImperativeHandle, useRef, useState } from "react";
import { FlatList, Platform, View } from "react-native";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import type { BlankSpace } from "./blank-space";
import type { MessageRow, ThreadHead } from "./build-rows";
import type { LeavingRows } from "./leave-rows";
import type { Latest } from "./list-position";
import type { ToggleReaction, ViewReactions } from "./message-actions";
import type { ProfileOf } from "./message-row";
import type { MemberNotice, Message, MessageEdits } from "./types";
import type { MessageLayout } from "~/features/preferences/store";
import { useBlankSpace } from "./blank-space";
import { arrivedAfter, newestFirst } from "./build-rows";
import { GrowthProvider } from "./grow";
import { JumpToLatest } from "./jump-to-latest";
import { useLeavingRows } from "./leave-rows";
import { ANCHOR, useLatest, usePlacement } from "./list-position";
import { useMenuKeyboard } from "./menu-keyboard";
import { MessageActionsProvider } from "./message-actions";
import { Row } from "./message-row";
import { RevealTimes } from "./reveal";
import { headerHeight } from "./row-header";

/** What the conversation screen can ask of its list. */
export interface MessageListHandle {
  /** Scrolls down to the newest message, as after sending one. */
  scrollToLatest: () => void;
}

interface RowsProps {
  listRef: RefObject<FlatList<MessageRow> | null>;
  /** The rows, with deleted ones leaving (see `useLeavingRows`). */
  leaving: LeavingRows;
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
  /** Freezes keyboard handling (see useMenuKeyboard). */
  freeze: SharedValue<boolean>;
  /** The list is laid out at its starting place. */
  onReady: () => void;
  /** A thread's room under its replies (see `useBlankSpace`). */
  blank: BlankSpace;
  /**
   * The fade-in has finished: until then the list renders only what's on
   * screen, so nothing mounts while it fades.
   */
  shown: boolean;
}

/** How many screens of rows stay mounted, centered on the screen. */
const WINDOW_SCREENS = 11;
/** How long the conversation takes to fade in. */
const FADE_MS = 220;

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
  leaving,
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
  shown,
  blank,
}: RowsProps) {
  const safeArea = useSafeAreaInsets();
  const { rows } = leaving;
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
          leaving={leaving.leavingOf(item.key)}
          onFaded={leaving.faded}
          onClosed={leaving.gone}
        />
      )}
      renderScrollComponent={(props) => (
        <KeyboardChatScrollView
          {...props}
          inverted
          offset={bottomInset}
          freeze={freeze}
          blankSpace={blank.blankSpace}
          onContentInsetChange={(insets) => latest.onInsetChange(insets.top)}
        />
      )}
      // Enough to fill the screen at once, and to reach the message it
      // opens on, so that one can be scrolled to before it shows. A page
      // that loads renders all at once, so the list grows (and the scroll
      // bar moves) once per page, not once per batch.
      initialNumToRender={Math.max(20, anchorIndex + 15)}
      maxToRenderPerBatch={8}
      // Just the screen until it has faded in: mounting rows takes the UI
      // thread, and a frame spent on it shows as a hitch in the fade. Then
      // five screens either way, filled in small batches.
      windowSize={shown ? WINDOW_SCREENS : 1}
      // Rows added below what's on screen leave it where it is; at the
      // bottom, a new message then slides into view (see useLatest). Off
      // until it has faded in, so it opens at the bottom whatever arrives
      // meanwhile.
      maintainVisibleContentPosition={shown ? ANCHOR : undefined}
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
      onContentSizeChange={(_, height) => {
        blank.onContentHeight(height);
        latest.onContentChange(rows[0]?.key, composerHeight);
        placement.onLaidOut();
      }}
      onScrollToIndexFailed={placement.onMissed}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      // A thread starts at the top, under its original (see
      // `useBlankSpace`).
      onLayout={(event) => blank.onListHeight(event.nativeEvent.layout.height)}
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
  "blank" | "freeze" | "latest" | "leaving" | "listRef" | "onReady" | "shown"
> & {
  messages: readonly Message[];
  /** A group's joins and leaves, shown between its messages. */
  notices?: readonly MemberNotice[];
  /** Set in a thread, whose original heads the list. */
  thread?: ThreadHead;
  ref?: Ref<MessageListHandle>;
  onJumpToLatest: () => void;
  onToggleReaction: ToggleReaction;
  /** Opens the sheet of who reacted to a part, on one emoji if given. */
  onViewReactions: ViewReactions;
  /** A tap on a message opens its thread; absent in a thread. */
  onOpenThread?: (message: Message) => void;
  /** The menu's Reply; absent in a thread. */
  onReply?: (message: Message) => void;
  /** The menu's Edit and Delete, on your own messages (`useEditing`). */
  editing?: MessageEdits;
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
  onOpenThread,
  onReply,
  editing,
  messages,
  notices,
  thread,
  ...props
}: MessageListProps) {
  const listRef = useRef<FlatList<MessageRow>>(null);
  const frame = useAnimatedRef<View>();
  // Covered until laid out at its starting place, then faded in. A
  // page-colored cover fades away rather than the list fading in: glass
  // created under a fully transparent parent never draws.
  const loaded = useSharedValue(0);
  const cover = useAnimatedStyle(() => ({ opacity: 1 - loaded.value }));
  const latest = useLatest(listRef, props.anchorId === undefined);
  const [shown, setShown] = useState(false);
  const { isNearLatest, scrollToLatest, scrollToNewest } = latest;
  // Read out first: the worklet must not capture `props` (messages hold
  // Dates, which worklets can't copy).
  const { hasNewer } = props;
  const showJump = useDerivedValue(() => hasNewer || !isNearLatest.value);
  const keyboard = useMenuKeyboard();
  const blank = useBlankSpace(thread !== undefined);
  const leaving = useLeavingRows(
    messages,
    (shown) => newestFirst(shown, props.layout, thread, notices),
    (row) => headerHeight(row, props),
  );

  useImperativeHandle(ref, () => ({ scrollToLatest }));

  return (
    <MessageActionsProvider
      onToggleReaction={onToggleReaction}
      onViewReactions={onViewReactions}
      onOpenThread={onOpenThread}
      onReply={onReply}
      editing={editing}
      // The menu is a modal, which takes the keyboard down on iOS and
      // reports it again on Android; the list stays still through both.
      menuKeyboard={keyboard}
    >
      <RevealTimes>
        <View ref={frame} style={{ flex: 1 }}>
          <GrowthProvider
            list={frame}
            // Android moves the rows as the blank space changes, so rows
            // that change size update it at once (see `lift`).
            blank={Platform.OS === "android" ? blank.sizes : undefined}
          >
            <Rows
              {...props}
              leaving={leaving}
              blank={blank}
              listRef={listRef}
              latest={latest}
              freeze={keyboard.freeze}
              shown={shown}
              onReady={() => {
                // Two frames later, once the first scroll (to the message it
                // opened on) has drawn and the rows' mounting is done, so it
                // can't hitch the fade's first frame.
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    loaded.set(
                      withTiming(1, { duration: FADE_MS }, (done) => {
                        if (done === true) scheduleOnRN(setShown, true);
                      }),
                    );
                  }),
                );
              }}
            />
          </GrowthProvider>
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
