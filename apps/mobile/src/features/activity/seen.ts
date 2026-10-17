import type {
  LegendListRef,
  LegendListState,
  ViewToken,
} from "@legendapp/list/react-native";
import type { LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

import type { ActivityEntry, ActivityListRow } from "./activity";
import { markSeen } from "./activity";

/**
 * How long a row must stay entirely on screen to count as seen. Long
 * enough that you see its dot before it fades.
 */
const DWELL_MS = 500;
/** How soon to look again at a row the list hasn't laid out yet. */
const MEASURE_RETRY_MS = 200;
/** Rounding slack, in points, when checking a row is entirely on screen. */
const SLACK = 1;

/**
 * Rows Legend List reports as at least partly in the list's frame. The
 * frame runs under the header and tab bar, so these are only candidates.
 */
export const CANDIDATE_VIEWABILITY = { itemVisiblePercentThreshold: 1 };

/**
 * Works out which Activity rows have really been seen: entirely on screen,
 * clear of the header and tab bar, for `DWELL_MS`, while the tab is focused
 * and the app is in front. A row scrolled past, or peeking in at an edge,
 * doesn't count. Each row seen is reported once (see `markSeen`).
 */
function createSeenTracker() {
  let list: LegendListRef | undefined;
  // The part of the list's frame clear of its header and tab bar.
  let area: { top: number; bottom: number } | undefined;
  let focused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const candidates = new Map<string, ActivityEntry>();
  // When each row came entirely on screen, by key.
  const since = new Map<string, number>();
  // Rows already reported.
  const sent = new Set<string>();

  /**
   * Whether the row is entirely in `area`, by the list's layout, or
   * "unmeasured" while the list hasn't laid it out yet (a row that just
   * arrived).
   */
  function placement(state: LegendListState, key: string) {
    const position = state.positionByKey(key);
    const size = state.sizes.get(key) ?? 0;
    if (area === undefined || position === undefined || size === 0) {
      return "unmeasured";
    }
    // Positions are in content coordinates; the frame starts at the
    // scroll offset.
    const top = position - state.scroll;
    return top >= area.top - SLACK && top + size <= area.bottom + SLACK
      ? "on"
      : "off";
  }

  /** The list's layout, while its rows can be seen. */
  function visibleState() {
    if (!focused || AppState.currentState !== "active") return undefined;
    return list?.getState();
  }

  /**
   * Where one unseen row stands: seen (on screen long enough), or how long
   * until it might be (Infinity when it's off screen).
   */
  function step(state: LegendListState, key: string, now: number) {
    const where = placement(state, key);
    if (where !== "on") {
      since.delete(key);
      // Nothing else tells us once it's laid out, so look again soon.
      return {
        seen: false,
        wait: where === "unmeasured" ? MEASURE_RETRY_MS : Infinity,
      };
    }
    const start = since.get(key) ?? now;
    since.set(key, start);
    if (now - start < DWELL_MS) {
      return { seen: false, wait: start + DWELL_MS - now };
    }
    since.delete(key);
    return { seen: true, wait: Infinity };
  }

  /** Reports rows that stayed on screen long enough; waits for the rest. */
  function check() {
    clearTimeout(timer);
    timer = undefined;
    const state = visibleState();
    if (state === undefined) {
      since.clear();
      return;
    }
    const now = Date.now();
    const seen = new Array<ActivityEntry>();
    let wait = Number.POSITIVE_INFINITY;
    for (const [key, entry] of candidates) {
      if (!entry.unseen || sent.has(key)) continue;
      const result = step(state, key, now);
      wait = Math.min(wait, result.wait);
      if (!result.seen) continue;
      sent.add(key);
      seen.push(entry);
    }
    if (seen.length > 0) {
      void markSeen(seen).then((saved) => {
        // Try again the next time they're on screen.
        if (!saved) for (const { key } of seen) sent.delete(key);
      });
    }
    if (Number.isFinite(wait)) timer = setTimeout(check, wait + 16);
  }

  return {
    check,
    /** The list's ref callback. */
    attachList: (ref: LegendListRef | null) => {
      list = ref ?? undefined;
    },
    /** Layout of a view filling the list's safe area (see `SafeAreaProbe`). */
    onSafeArea: (event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      area = { bottom: y + height, top: y };
      check();
    },
    onViewableItemsChanged: ({
      viewableItems,
    }: {
      viewableItems: ViewToken<ActivityListRow>[];
    }) => {
      candidates.clear();
      for (const { item, key } of viewableItems) {
        if (item.kind === "activity") candidates.set(key, item.entry);
      }
      check();
    },
    focus: () => {
      focused = true;
      check();
      const subscription = AppState.addEventListener("change", check);
      return () => {
        focused = false;
        since.clear();
        clearTimeout(timer);
        subscription.remove();
      };
    },
  };
}

/** Tracks which rows of the Activity list have been seen (see above). */
export function useSeenTracking() {
  const [tracker] = useState(createSeenTracker);
  useFocusEffect(tracker.focus);
  return tracker;
}
