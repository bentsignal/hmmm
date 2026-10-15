import type { RefObject } from "react";
import type { FlatList } from "react-native";
import { useRef, useState } from "react";
import { Platform } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import type { MessageRow } from "./build-rows";

// Where the conversation list is scrolled: placing it when it opens, and
// keeping up with the newest message.

/**
 * How close to the newest message (in points) still counts as being there
 * for the jump button, which stays hidden.
 */
const NEAR_LATEST = 80;
/**
 * How far from the bottom still counts as at the bottom, so the list stays
 * pinned there: a scroll up by more than this lets go.
 */
const PIN_SLOP = 4;
/** Frames to wait for the message a conversation opens on to be measured. */
const ANCHOR_TRIES = 30;

interface LatestState {
  /** The keyboard's inset (iOS), which the newest message sits above. */
  inset: number;
  pinned: boolean;
  /** You're dragging the list, or it's still moving from a fling. */
  scrolling: boolean;
  newest?: string;
  /** You just sent one: the list follows it down even if scrolled up. */
  sending: boolean;
}

/**
 * Keeps the list on the newest message while you're at the bottom, and
 * lets go the moment you scroll up.
 *
 * Pinned, the list has no scroll anchor (`pinned` is true), so it stays at
 * offset 0, the bottom of an inverted list: new messages, a composer that
 * grows, and rows that change size all keep the newest message in view,
 * with no scrolling at all. Once you drag or fling away from the bottom it
 * unpins, and the native anchor (`maintainVisibleContentPosition`) keeps
 * what you're reading still as messages arrive below. Only your own scroll
 * unpins it (the keyboard lifting the list never does), and reaching the
 * bottom pins it again.
 *
 * On iOS the keyboard lifts the list with a top content inset, so the
 * bottom is at minus that inset rather than 0.
 */
export function useLatest(
  listRef: RefObject<FlatList<MessageRow> | null>,
  pinnedAtStart: boolean,
) {
  const isNearLatest = useSharedValue(pinnedAtStart);
  const [pinned, setPinned] = useState(pinnedAtStart);
  const state = useRef<LatestState>({
    inset: 0,
    pinned: pinnedAtStart,
    scrolling: false,
    sending: false,
  });
  function bottom() {
    return Platform.OS === "ios" ? -state.current.inset : 0;
  }
  function pin(next: boolean) {
    if (state.current.pinned === next) return;
    state.current.pinned = next;
    setPinned(next);
  }
  function scrollToNewest() {
    listRef.current?.scrollToOffset({ animated: true, offset: bottom() });
  }
  return {
    isNearLatest,
    /** No scroll anchor while pinned (see above). */
    pinned,
    scrollToNewest,
    /** Scrolls down to the newest message, and follows the one being sent. */
    scrollToLatest: () => {
      state.current.sending = true;
      scrollToNewest();
    },
    onInsetChange: (top: number) => {
      state.current.inset = top;
    },
    scrollHandlers: {
      onScrollBeginDrag: () => {
        state.current.scrolling = true;
      },
      onMomentumScrollEnd: () => {
        state.current.scrolling = false;
      },
      onScrollEndDrag: (event: {
        nativeEvent: { velocity?: { y: number } };
      }) => {
        // No fling: the scroll ends with the drag.
        if ((event.nativeEvent.velocity?.y ?? 0) === 0) {
          state.current.scrolling = false;
        }
      },
    },
    onScroll: (offset: number) => {
      const fromBottom = offset - bottom();
      isNearLatest.set(fromBottom < NEAR_LATEST);
      if (fromBottom <= PIN_SLOP) pin(true);
      else if (state.current.scrolling) pin(false);
    },
    /** The list changed: follows a message you just sent down to it. */
    onNewest: (key: string | undefined) => {
      const { newest, sending } = state.current;
      state.current.newest = key;
      if (!sending || newest === undefined || key === newest) return;
      state.current.sending = false;
      if (!state.current.pinned) scrollToNewest();
    },
  };
}

export type Latest = ReturnType<typeof useLatest>;

interface PlacementState {
  /** The last scroll to the anchor missed: its row isn't measured yet. */
  missed: boolean;
  placed: boolean;
  started: boolean;
}

/** Scrolls to the anchor's row, trying again each frame until it can. */
function scrollToAnchor(attempt: {
  listRef: RefObject<FlatList<MessageRow> | null>;
  index: number;
  state: PlacementState;
  tries: number;
  done: () => void;
}) {
  const { listRef, index, state, tries, done } = attempt;
  state.missed = false;
  listRef.current?.scrollToIndex({ animated: false, index, viewPosition: 0.5 });
  if (missedAgain(state) && tries < ANCHOR_TRIES) {
    requestAnimationFrame(() =>
      scrollToAnchor({ ...attempt, tries: tries + 1 }),
    );
  } else {
    done();
  }
}

/** Read through a call: `onScrollToIndexFailed` sets it during the scroll. */
function missedAgain(state: PlacementState) {
  return state.missed;
}

/**
 * Puts the list at its starting place once it's laid out, then shows it:
 * the newest message, or centered on the message it opened on. The list
 * can't scroll to a row it hasn't measured yet, so that tries again each
 * frame until it has. Until it's placed, it pages in nothing (at first it
 * sits at the newest loaded message, which would ask for newer ones).
 */
export function usePlacement({
  listRef,
  anchorIndex,
  onReady,
  onLoadNewer,
}: {
  listRef: RefObject<FlatList<MessageRow> | null>;
  anchorIndex: number;
  onReady: () => void;
  onLoadNewer: () => void;
}) {
  const state = useRef<PlacementState>({
    missed: false,
    placed: false,
    started: false,
  });
  function place() {
    state.current.placed = true;
    onReady();
  }
  return {
    isPlaced: () => state.current.placed,
    /** The list has laid out its content. */
    onLaidOut: () => {
      if (state.current.started) return;
      state.current.started = true;
      if (anchorIndex === -1) {
        place();
        return;
      }
      scrollToAnchor({
        done: () => {
          place();
          // Newer messages, in case it opened close enough to them that
          // the list won't ask again.
          onLoadNewer();
        },
        index: anchorIndex,
        listRef,
        state: state.current,
        tries: 0,
      });
    },
    onMissed: () => {
      state.current.missed = true;
    },
  };
}
