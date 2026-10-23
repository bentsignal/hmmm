import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";
import { useId } from "react";
import { Pressable } from "react-native";

import type { MenuPress } from "./row-touch";
import type { Message } from "./types";
import { useMessageActions } from "./message-actions";
import { openRowMenu } from "./row-taps";
import {
  MenuPressContext,
  reportTouch,
  RowIdContext,
  rowTarget,
  useRowTap,
} from "./row-touch";
import { LONG_PRESS_MS } from "./squeeze";

/**
 * A message's row, across the screen and from the top of the sender's name
 * to the bottom of the message, which takes its taps (see `useRowTaps`)
 * and holds wherever they land: a hold lifts it with its menu. Parts that
 * are buttons of their own (a photo, a link card, the thread's count, a
 * reaction) keep their touches to themselves.
 */
export function MessageRowTarget({
  message,
  children,
}: {
  message: Message;
  children: ReactNode;
}) {
  const { openThread } = useMessageActions();
  const row = useId();
  // A message still sending (or that failed) has no menu or thread yet.
  // A deleted one has its thread, but no menu.
  const sent = message.status === undefined;
  const holdable = sent && message.deleted !== true;
  useRowTap(row, {
    holdable,
    openThread:
      openThread !== undefined && sent ? () => openThread(message) : undefined,
  });
  const press = {
    delayLongPress: LONG_PRESS_MS,
    onLongPress: (event: GestureResponderEvent) => {
      if (holdable) openRowMenu(row, event.nativeEvent.pageY);
    },
    onPressIn: (event: GestureResponderEvent) => {
      reportTouch("row", row, event.nativeEvent.pageY);
      if (holdable) rowTarget(row)?.pressIn(event.nativeEvent.pageY);
    },
    onPressOut: () => rowTarget(row)?.release(),
  } satisfies MenuPress;
  return (
    <RowIdContext value={row}>
      <Pressable
        // Not one element to VoiceOver: the message's parts keep their
        // own, and the thread's count and quote are its buttons.
        accessible={false}
        {...press}
      >
        {/* Links in text that isn't a part of its own hold the row. */}
        <MenuPressContext value={press}>{children}</MenuPressContext>
      </Pressable>
    </RowIdContext>
  );
}
