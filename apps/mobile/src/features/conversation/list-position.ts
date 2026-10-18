import type { RefObject } from "react";
import type { FlatList } from "react-native";
import { useRef } from "react";
import { Platform } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import type { ListRow } from "./typing-row";

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
/** Longer than the platform's slide to the newest message takes. */
const SLIDE_MS = 450;
/** Frames to wait for the message a conversation opens on to be measured. */
const ANCHOR_TRIES = 30;

interface LatestState {
  /** The keyboard's inset (iOS), which the newest message sits above. */
  inset: number;
  pinned: boolean;
  /** You're dragging the list, or it's still moving from a fling. */
  scrolling: boolean;
  /** Sliding to something new below, until it's at the bottom. */
  following: boolean;
  /** How far above the bottom the last scroll event was. */
  scrolled: number;
  /** The composer's height when content last changed. */
  composer?: number;
}

/**
 * Keeps the list on the newest message while you're at the bottom, and
 * lets go the moment you scroll up.
 *
 * The native scroll anchor (`maintainVisibleContentPosition`, see
 * `ANCHOR`) keeps the newest row on screen still, and what's above it
 * moves up as it grows. So at the bottom a new message, or someone
 * typing, opens right there, and the messages above make room (see
 * `Arrive`), with no scrolling at all; scrolled up, nothing on screen
 * moves. Only a taller composer, under the newest row, scrolls: the
 * anchor keeps the rows still as it grows, and when the list is pinned it
 * then slides the rest into view with the platform's own animated scroll.
 * Only your own drag or fling unpins it (the keyboard lifting the list
 * never does), and reaching the bottom pins it again.
 *
 * On iOS the keyboard lifts the list with a top content inset, so the
 * bottom is at minus that inset rather than 0.
 */
export function useLatest(
  listRef: RefObject<FlatList<ListRow> | null>,
  pinnedAtStart: boolean,
) {
  const isNearLatest = useSharedValue(pinnedAtStart);
  const state = useRef<LatestState>({
    following: false,
    inset: 0,
    pinned: pinnedAtStart,
    scrolled: 0,
    scrolling: false,
  });
  function bottom() {
    return Platform.OS === "ios" ? -state.current.inset : 0;
  }
  function scrollToNewest() {
    listRef.current?.scrollToOffset({ animated: true, offset: bottom() });
  }
  return {
    isNearLatest,
    scrollToNewest,
    /** Scrolls down to the newest message, as after sending one. */
    scrollToLatest: () => {
      state.current.pinned = true;
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
      const scrolled = offset - bottom();
      const rose = scrolled > state.current.scrolled + 1;
      state.current.scrolled = scrolled;
      isNearLatest.set(scrolled < NEAR_LATEST);
      if (scrolled <= PIN_SLOP) {
        state.current.pinned = true;
        state.current.following = false;
      } else if (state.current.scrolling) {
        state.current.pinned = false;
        state.current.following = false;
      } else if (state.current.following && rose) {
        // The scroll anchor moved the list up after the slide began (as
        // the composer grew again), which stops the slide: it starts again
        // from there.
        scrollToNewest();
      }
    },
    /**
     * The list's content changed. Pinned, room for a taller composer
     * (`composer`) slides into view below what's there. Anything else (a
     * message or a reaction opening its space) leaves the scroll alone:
     * the newest row stays put and the rows above move up, and following
     * it would restart the scroll every frame.
     */
    onContentChange: (composer: number) => {
      const seen = state.current.composer;
      state.current.composer = composer;
      if (seen === undefined || composer === seen) return;
      if (!state.current.pinned) return;
      state.current.following = true;
      scrollToNewest();
      // A slide cut short (the anchor moving the list again as more
      // arrives) starts again once it should have finished.
      setTimeout(() => {
        const { following, pinned, scrolled, scrolling } = state.current;
        if (following && pinned && !scrolling && scrolled > PIN_SLOP) {
          scrollToNewest();
        }
      }, SLIDE_MS);
    },
  };
}

/**
 * The scroll anchor: the first row on screen, from the newest row up,
 * stays where it is when rows are added or grow below it. (The list skips
 * its header, the space for the composer, on its own, so index 0 is the
 * newest row, who's typing, and a new message added right above it opens
 * above the anchor.)
 */
export const ANCHOR = { minIndexForVisible: 0 };

export type Latest = ReturnType<typeof useLatest>;

interface PlacementState {
  /** The last scroll to the anchor missed: its row isn't measured yet. */
  missed: boolean;
  placed: boolean;
  started: boolean;
}

/** Scrolls to the anchor's row, trying again each frame until it can. */
function scrollToAnchor(attempt: {
  listRef: RefObject<FlatList<ListRow> | null>;
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
  onLoadOlder,
}: {
  listRef: RefObject<FlatList<ListRow> | null>;
  anchorIndex: number;
  onReady: () => void;
  onLoadNewer: () => void;
  onLoadOlder: () => void;
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
    /** Pages in older messages, once placed. */
    loadOlder: () => {
      if (state.current.placed) onLoadOlder();
    },
    /** Pages in newer messages, once placed. */
    loadNewer: () => {
      if (state.current.placed) onLoadNewer();
    },
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
