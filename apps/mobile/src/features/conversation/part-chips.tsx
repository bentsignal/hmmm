import type { ComponentProps } from "react";
import type { View as NativeView } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import type {
  ReactionPart,
  ReactionSummary,
} from "~/features/messaging/reactions";
import { impact, selectionTick } from "~/lib/native-extras";
import { GrowingSpace, usePieceLift } from "./grow";
import { useMessageActions } from "./message-actions";
import { ChipRow } from "./reaction-chips";

/** How a part's reactions make room for themselves (see `GrowingSpace`). */
export interface Room {
  /** The row's order (see `rowOrder`). */
  order: number;
  /** Where the space is in the row (see `Place`). */
  place: number;
  /** Whether they arrived while the conversation was on screen. */
  animate: boolean;
  /** The message, measured to tell whether it's on screen. */
  measured: AnimatedRef<NativeView>;
}

/** Stacked rows' chips, under a part or the whole message. */
function Chips({
  open,
  room,
  ...row
}: ComponentProps<typeof ChipRow> & { open: boolean; room: Room }) {
  const [used, setUsed] = useState(open);
  if (open && !used) setUsed(true);
  // Already there when the row appeared: laid out with it.
  if (!room.animate) return open ? <ChipRow {...row} /> : null;
  return used ? <GrowingChips open={open} room={room} {...row} /> : null;
}

/**
 * Chips that arrive while you watch, in space that opens to fit them. The
 * row moves up as it opens (see `useRowLift`), and the chips stay put:
 * they're drawn where they end up, and pop in.
 */
function GrowingChips({
  open,
  room,
  ...row
}: ComponentProps<typeof ChipRow> & { open: boolean; room: Room }) {
  const [natural, setNatural] = useState(0);
  const stay = usePieceLift(room.order, room.place, true);
  return (
    <View>
      <GrowingSpace height={open ? natural : 0} {...room} />
      <Animated.View
        // Laid out on its own, as wide as the row, so it has its full
        // height whatever the space's.
        className="absolute inset-x-0 top-0"
        style={stay}
        onLayout={(event) => setNatural(event.nativeEvent.layout.height)}
      >
        {open && <ChipRow {...row} />}
      </Animated.View>
    </View>
  );
}

/**
 * A part's chips, which add or take back a reaction on it when tapped and
 * show who reacted with it when held.
 */
export function PartChips({
  messageId,
  part,
  reactions,
  align,
  room,
}: {
  messageId: string;
  part: ReactionPart;
  reactions: readonly ReactionSummary[];
  align: "end" | "start";
  room: Room;
}) {
  const { toggleReaction, viewReactions } = useMessageActions();
  return (
    <Chips
      open={reactions.length > 0}
      room={room}
      reactions={reactions}
      align={align}
      onToggle={(emoji) => {
        selectionTick();
        toggleReaction(messageId, emoji, part);
      }}
      onHold={(emoji) => {
        impact();
        viewReactions(messageId, part, emoji);
      }}
    />
  );
}
