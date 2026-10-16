import { useRef } from "react";
import { Platform } from "react-native";
import {
  KeyboardController,
  useKeyboardHandler,
} from "react-native-keyboard-controller";
import { useSharedValue } from "react-native-reanimated";

/** Longest a hold lasts if the keyboard report it waits for never comes. */
const HOLD_LIMIT_MS = 1500;

/**
 * Keeps the conversation perfectly still while the long-press menu (a
 * `Modal`) opens and closes, as Messages does.
 *
 * iOS: a modal takes the keyboard down. If it was up, the list's keyboard
 * handling freezes as the menu opens, so the messages stay where they were
 * over the space the keyboard leaves, rather than sliding down behind the
 * blur and back. When the menu closes back to the chat, the message field
 * gets its focus back, and the list lets go only once the keyboard is all
 * the way up again: nothing moves. Closing into something else (a sheet, a
 * link) lets go at once and leaves the keyboard down.
 *
 * Android: whenever a modal shows or is dismissed there,
 * react-native-keyboard-controller reports the keyboard's position again
 * (`ModalAttachedWatcher` calls `syncKeyboardPosition`): a move and an end,
 * with no start, and the list would scroll to the offset it saved at the
 * last start (0 if the keyboard never opened). So it freezes just before
 * the menu opens or closes, and that report's end lets it go.
 */
export function useMenuKeyboard() {
  const freeze = useSharedValue(false);
  /** iOS: the keyboard is coming back; its end lets the list go. */
  const returning = useSharedValue(false);
  // Which hold a fallback timer belongs to, so an old one never ends a
  // newer hold early.
  const holds = useRef(0);
  /** iOS: the keyboard was up when the menu opened. */
  const keyboardWasUp = useRef(false);
  useKeyboardHandler(
    {
      onEnd: (event) => {
        "worklet";
        if (!freeze.get()) return;
        if (Platform.OS === "android") {
          freeze.set(false);
        } else if (returning.get() && event.height > 0) {
          returning.set(false);
          freeze.set(false);
        }
      },
    },
    [],
  );

  function hold() {
    holds.current += 1;
    freeze.set(true);
    return holds.current;
  }

  /** Lets go after `HOLD_LIMIT_MS` if what it waits for never comes. */
  function letGoLater(hold: number) {
    setTimeout(() => {
      if (holds.current !== hold) return;
      returning.set(false);
      freeze.set(false);
    }, HOLD_LIMIT_MS);
  }

  return {
    /** Pass to the list's `freeze`. */
    freeze,
    onOpen: () => {
      if (Platform.OS === "android") {
        letGoLater(hold());
        return;
      }
      keyboardWasUp.current = KeyboardController.isVisible();
      if (keyboardWasUp.current) hold();
    },
    onClosing: () => {
      if (Platform.OS === "android") letGoLater(hold());
    },
    onClosed: (backToChat: boolean) => {
      if (Platform.OS === "android" || !keyboardWasUp.current) return;
      keyboardWasUp.current = false;
      if (!backToChat) {
        holds.current += 1;
        freeze.set(false);
        return;
      }
      returning.set(true);
      KeyboardController.setFocusTo("current");
      letGoLater(holds.current);
    },
  };
}
