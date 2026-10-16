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

  function update() {
    if (!enabled) return;
    const { content, list } = sizes.current;
    blankSpace.set(Math.max(0, list - content));
  }

  return {
    blankSpace: enabled ? blankSpace : undefined,
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
