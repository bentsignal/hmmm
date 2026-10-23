import type { RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useImperativeHandle, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import type { Lift, MessageListViewMethods } from "./native";
import type { MessageListProps } from "~/features/conversation/message-list";
import type { Message } from "~/features/conversation/types";
import { newestFirst } from "~/features/conversation/build-rows";
import { JumpToLatest } from "~/features/conversation/jump-to-latest";
import { useMenuKeyboard } from "~/features/conversation/menu-keyboard";
import {
  MessageActionsProvider,
  useLiftedMessageId,
  useMessageActions,
} from "~/features/conversation/message-actions";
import { useDevNativeFling } from "./dev-native-fling";
import { LiftedPreview } from "./lifted-preview";
import { nativeRows } from "./map-rows";
import {
  CONTRACT_VERSION,
  MessageListView,
  nativeSupport,
  V1_BLOCK_TYPES,
  V1_ROW_KINDS,
} from "./native";
import { BEHAVIOR, useNativeTheme } from "./theme";
import { useListEvents } from "./use-list-events";

/** The binary lifts the held message into the menu itself (`lift`). */
const LIFTS = nativeSupport?.features?.includes("lift") === true;

/** The gap between the newest row and the composer (`COMPOSER_GAP`). */
const COMPOSER_GAP = 8;
/** Room above the oldest row, under the header. */
const HEADER_GAP = 8;
/** How long the conversation takes to fade in (`FADE_MS`). */
const FADE_MS = 220;

/**
 * The composer's height in React. On iOS it reaches only the UI thread
 * after the first (see `useComposerHeight`), and the native list takes it
 * as a prop.
 */
function useComposerHeightNow(live: SharedValue<number>, first: number) {
  const [height, setHeight] = useState(first);
  useAnimatedReaction(
    () => live.get(),
    (now, before) => {
      if (now !== before) scheduleOnRN(setHeight, now);
    },
  );
  return height;
}

type RowsProps = Omit<
  MessageListProps,
  "editing" | "onReply" | "onViewReactions" | "ref"
> & {
  handle: MessageListProps["ref"];
  /** The menu has the keyboard held where it was (`useMenuKeyboard`). */
  keyboardFrozen: boolean;
};

/**
 * Holds the keyboard where it is while the long-press menu (a modal) takes
 * it down and brings it back, as the React Native list does
 * (`useMenuKeyboard`). Only on iOS: Android's quirk it also covers is the
 * React Native list's keyboard handling, which the native list doesn't use.
 */
function useFrozenKeyboard() {
  const keyboard = useMenuKeyboard();
  const [frozen, setFrozen] = useState(false);
  useAnimatedReaction(
    () => keyboard.freeze.get(),
    (now, before) => {
      if (now !== before) scheduleOnRN(setFrozen, now);
    },
  );
  return { frozen: Platform.OS === "ios" && frozen, keyboard };
}

/**
 * The list's rows (see `nativeRows`), and the message each message row
 * shows, by its ID.
 */
function useRows({
  messages,
  notices,
  thread,
  typists,
  ...context
}: Pick<
  RowsProps,
  | "anchorId"
  | "layout"
  | "messages"
  | "notices"
  | "profileOf"
  | "self"
  | "showAuthors"
  | "thread"
  | "typists"
>) {
  // Only messages that arrive while it's open animate in.
  const [openedAt] = useState(Date.now);
  const built = newestFirst(messages, context.layout, thread, notices);
  const byId = new Map<string, Message>();
  for (const row of built) {
    if (row.type === "message") byId.set(row.key, row.message);
  }
  const rows = nativeRows(built, typists, {
    ...context,
    openedAt,
    support: nativeSupport ?? {
      blockTypes: V1_BLOCK_TYPES,
      rowKinds: V1_ROW_KINDS,
    },
  });
  return { messageOf: (rowId: string) => byId.get(rowId), rows };
}

/**
 * Where the list is: near the newest message (for the jump button), and
 * placed and faded in, covered until then like the React Native list.
 */
function usePlace(startsAtLatest: boolean, hasNewer: boolean) {
  const near = useSharedValue(startsAtLatest);
  const loaded = useSharedValue(0);
  return {
    cover: useAnimatedStyle(() => ({ opacity: 1 - loaded.value })),
    onNearLatest: (value: boolean) => near.set(value),
    onReady: () => loaded.set(withTiming(1, { duration: FADE_MS })),
    showJump: useDerivedValue(() => hasNewer || !near.value),
  };
}

function useLift(view: RefObject<MessageListViewMethods | null>) {
  const [lift, setLift] = useState<Lift>();
  function change(next: Lift | undefined) {
    setLift(next);
    if (
      next === undefined &&
      nativeSupport?.features?.includes("liftHandoff") === true
    ) {
      return view.current?.landLift?.();
    }
  }
  return { change, lift };
}

function NativeRows({
  handle,
  onJumpToLatest,
  onToggleReaction,
  onOpenThread,
  hasNewer,
  onLoadOlder,
  onLoadNewer,
  topInset,
  composerHeight,
  bottomInset,
  keyboardFrozen,
  ...shown
}: RowsProps) {
  const view = useRef<MessageListViewMethods>(null);
  useDevNativeFling(view);
  const { open } = useMessageActions();
  const { layout, self } = shown;
  const place = usePlace(shown.anchorId === undefined, hasNewer);
  const theme = useNativeTheme(layout);
  const safeTop = useSafeAreaInsets().top;
  const composer = useComposerHeightNow(
    composerHeight.live,
    composerHeight.laidOut ?? 0,
  );
  const { messageOf, rows } = useRows(shown);
  const { lift, change: changeLift } = useLift(view);

  function scrollToLatest() {
    void view.current?.scrollToLatest(true);
  }
  useImperativeHandle(handle, () => ({ scrollToLatest }));

  const onEvent = useListEvents({
    menu: {
      layout,
      preview: (message, held) => (
        <LiftedPreview
          message={message}
          held={held}
          layout={layout}
          isOwn={message.authorId === self}
        />
      ),
      self,
      lift: LIFTS ? changeLift : undefined,
    },
    messageOf,
    openMenu: open,
    openThread: onOpenThread,
    pages: { ...place, onLoadNewer, onLoadOlder },
    toggleReaction: onToggleReaction,
  });

  const lifted = useLiftedMessageId();
  if (MessageListView === null) return null;
  return (
    <>
      <View style={{ flex: 1 }}>
        <MessageListView
          ref={view}
          style={{ flex: 1 }}
          contractVersion={CONTRACT_VERSION}
          rows={rows}
          theme={theme}
          behavior={BEHAVIOR}
          insets={{
            bottom: composer + COMPOSER_GAP,
            keyboardOverlap: bottomInset,
            top: safeTop + topInset + HEADER_GAP,
          }}
          keyboard
          keyboardFrozen={keyboardFrozen}
          alignTop={shown.thread !== undefined}
          liftedRowId={LIFTS ? undefined : lifted}
          lift={lift}
          initialRowId={shown.anchorId}
          onEvent={onEvent}
        />
      </View>
      <Animated.View
        pointerEvents="none"
        className="bg-background absolute inset-0"
        style={place.cover}
      />
      <JumpToLatest
        visible={place.showJump}
        above={composerHeight.live}
        onPress={() => {
          if (hasNewer) onJumpToLatest();
          else scrollToLatest();
        }}
      />
    </>
  );
}

/**
 * The conversation in the native message list (see
 * .plans/native-message-list.md), with the same props as `MessageList`,
 * so a screen can use either (see `ConversationList`). The menu, reactions
 * sheet, and actions are the React Native list's own.
 */
export function NativeMessageList({
  ref,
  onViewReactions,
  onReply,
  editing,
  ...props
}: MessageListProps) {
  const { frozen, keyboard } = useFrozenKeyboard();
  return (
    <MessageActionsProvider
      onToggleReaction={props.onToggleReaction}
      onViewReactions={onViewReactions}
      onOpenThread={props.onOpenThread}
      onReply={onReply}
      editing={editing}
      menuKeyboard={keyboard}
    >
      <NativeRows {...props} handle={ref} keyboardFrozen={frozen} />
    </MessageActionsProvider>
  );
}
