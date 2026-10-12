import type { RefObject } from "react";
import type { FlatList } from "react-native";
import { useRef } from "react";
import { useSharedValue } from "react-native-reanimated";

import type { MessageRow } from "./build-rows";

// Where the conversation list is scrolled: placing it when it opens, and
// keeping up with the newest message.

/**
 * How close to the newest message (in points) still counts as being there:
 * new messages then scroll into view, and the jump button stays hidden.
 */
const NEAR_LATEST = 80;
/** Frames to wait for the message a conversation opens on to be measured. */
const ANCHOR_TRIES = 30;

/**
 * Where the newest message is, and staying with it as new ones arrive.
 * Inverted, the newest message is at offset 0, less the keyboard's inset
 * (react-native-keyboard-controller lifts the list with a top content
 * inset), so scrolling to 0 would leave it behind the keyboard. That's
 * also why this follows new messages itself instead of the native
 * `autoscrollToTopThreshold`, which always scrolls to 0.
 */
export function useLatest(listRef: RefObject<FlatList<MessageRow> | null>) {
  const isNearLatest = useSharedValue(true);
  const state = useRef<{
    /** The keyboard's inset, which the newest message sits above. */
    inset: number;
    near: boolean;
    newest?: string;
    /** You just sent one: the next new message is followed regardless. */
    sending: boolean;
  }>({ inset: 0, near: true, sending: false });
  function scrollToNewest() {
    listRef.current?.scrollToOffset({
      animated: true,
      offset: -state.current.inset,
    });
  }
  return {
    isNearLatest,
    scrollToNewest,
    /** Scrolls down to the newest message, and to the one being sent. */
    scrollToLatest: () => {
      state.current.sending = true;
      scrollToNewest();
    },
    onInsetChange: (top: number) => {
      state.current.inset = top;
    },
    onScroll: (offset: number) => {
      const near = offset + state.current.inset < NEAR_LATEST;
      state.current.near = near;
      isNearLatest.set(near);
    },
    /**
     * The list changed. A new newest message slides into view if you were
     * at the newest one, or just sent it, unless it's a newer page
     * (`follow` is false).
     */
    onNewest: (key: string | undefined, follow: boolean) => {
      const { newest, near, sending } = state.current;
      state.current.newest = key;
      if (!follow || newest === undefined || key === newest) return;
      state.current.sending = false;
      if (near || sending) scrollToNewest();
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
