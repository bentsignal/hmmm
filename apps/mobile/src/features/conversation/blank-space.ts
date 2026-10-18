import type { SharedValue } from "react-native-reanimated";
import { useRef } from "react";
import { useSharedValue } from "react-native-reanimated";

/**
 * A thread starts at the top, under its original: the room its replies
 * leave below them is padding on the newest side, which the keyboard
 * opens into (see `KeyboardChatScrollView`'s `blankSpace`), so opening
 * it moves nothing until the replies would be covered. Off, the list
 * starts at the bottom like a conversation.
 */
export function useBlankSpace(enabled: boolean) {
  const blankSpace = useSharedValue(0);
  const sizes = useRef({ content: 0, list: 0 });
  // The same, for rows that change size to keep up with on the UI thread
  // (see `lift` in grow.tsx).
  const content = useSharedValue(0);
  const list = useSharedValue(0);

  function update() {
    if (!enabled) return;
    content.set(sizes.current.content);
    list.set(sizes.current.list);
    blankSpace.set(Math.max(0, sizes.current.list - sizes.current.content));
  }

  return {
    blankSpace: enabled ? blankSpace : undefined,
    /** What a row changing size updates at once (see `Blank`). */
    sizes: enabled ? { content, list, space: blankSpace } : undefined,
    /** The list's own height, from its `onLayout`. */
    onListHeight: (height: number) => {
      sizes.current.list = height;
      update();
    },
    /** Everything in it, from its `onContentSizeChange`. */
    onContentHeight: (height: number) => {
      sizes.current.content = height;
      update();
    },
  };
}

/** The blank space under a thread's replies, and what it's made from. */
export interface Blank {
  readonly space: SharedValue<number>;
  readonly content: SharedValue<number>;
  readonly list: SharedValue<number>;
}

export type BlankSpace = ReturnType<typeof useBlankSpace>;
