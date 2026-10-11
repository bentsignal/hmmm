import { useRef } from "react";
import { Platform } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useSharedValue } from "react-native-reanimated";

/** Longest a hold lasts if the keyboard report it waits for never comes. */
const HOLD_LIMIT_MS = 1500;

/**
 * Keeps the conversation still while a modal (the long-press menu) opens
 * and closes on Android.
 *
 * Whenever a `Modal` shows or is dismissed there, react-native-keyboard-
 * controller reports the keyboard's position again (`ModalAttachedWatcher`
 * calls `syncKeyboardPosition`): a move and an end, with no start. The
 * chat list scrolls on every keyboard move to the offset it saved at the
 * last start, which is 0 if the keyboard never opened, so the conversation
 * jumped to its top (and then paged in older messages) behind the menu.
 *
 * `hold` freezes the list's keyboard handling just before a modal shows or
 * closes; the report's end lets it go, so the list still follows the
 * keyboard as usual. iOS sends no such report and never holds.
 */
export function useModalKeyboardFreeze() {
  const freeze = useSharedValue(false);
  // Which hold a fallback timer belongs to, so an old one never ends a
  // newer hold early.
  const holds = useRef(0);
  useKeyboardHandler(
    {
      onEnd: () => {
        "worklet";
        if (freeze.value) freeze.value = false;
      },
    },
    [],
  );
  return {
    /** Pass to the list's `freeze`. */
    freeze,
    /** Call right before a modal shows or starts closing. */
    hold: () => {
      if (Platform.OS !== "android") return;
      holds.current += 1;
      const hold = holds.current;
      freeze.set(true);
      setTimeout(() => {
        if (holds.current === hold) freeze.set(false);
      }, HOLD_LIMIT_MS);
    },
  };
}
