import type { ComponentProps, ReactNode } from "react";
import type { View as NativeView } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type {
  ReactionPart,
  ReactionSummary,
} from "~/features/messaging/reactions";
import { reactionsOn } from "~/features/messaging/reactions";
import { impact, selectionTick } from "~/lib/native-extras";
import { GrowingSpace, usePieceLift } from "./grow";
import { useLeaving } from "./leaving";
import { useMessageActions } from "./message-actions";
import { showWithRoom } from "./moves";
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
 * they're drawn where they end up, and pop in once the messages have
 * started clearing the space, so they never cover what's below.
 *
 * They mount then rather than fading in with the space: a chip's glass
 * that mounts under a parent with opacity below 1 can stay blank (see
 * `GlassSurface`), as the first reaction on a message did.
 *
 * Taken back, the last of them fade out where they are, moving with the
 * message as their space closes. Held still on screen as when they came,
 * the message's text slid down over them; gone at once, they were drawn a
 * chip lower for the frames before React let go of them.
 */
function GrowingChips({
  open,
  room,
  ...row
}: ComponentProps<typeof ChipRow> & { open: boolean; room: Room }) {
  const [natural, setNatural] = useState(0);
  const stay = usePieceLift(room.order, room.place, true);
  // Mounted with the space (a render of React's mid-move draws the rows,
  // for a frame, where they were a few frames before), and grown in once
  // the messages have started clearing it (see `useAppear`).
  const shown = open && natural > 0;
  const leave = useLeaving(shown, row.reactions, "fade");
  const appear = useAppear(leave.leaving);
  return (
    <View>
      <GrowingSpace
        height={open ? natural : 0}
        onLanded={appear.onLanded}
        {...room}
      />
      <View
        // The chips' height, from a copy with no glass that's never drawn,
        // laid out on its own as wide as the row so it has its full height
        // whatever the space's.
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute inset-x-0 top-0 opacity-0"
        onLayout={(event) => {
          // Not as it empties on closing: nothing to make room for then.
          if (open) setNatural(event.nativeEvent.layout.height);
        }}
      >
        {open && <ChipRow ghost {...row} />}
      </View>
      <Animated.View
        pointerEvents={leave.leaving ? "none" : "auto"}
        className="absolute inset-x-0 top-0"
        style={leave.leaving ? leave.style : stay}
      >
        <Animated.View style={appear.style}>
          {(shown || leave.leaving) && (
            <ChipRow {...row} reactions={leave.value} />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * How chips that come with their space grow in: once the messages have
 * started clearing it, in step with them (see `showWithRoom`), from when
 * the space is on screen (`onLanded`). Back to nothing once they've gone
 * (`leaving` over), for the next time.
 */
function useAppear(leaving: boolean) {
  const shown = useSharedValue(0);
  useAnimatedReaction(
    () => leaving,
    (now, before) => {
      if (before === true && !now) shown.set(0);
    },
    [leaving],
  );
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(shown.get(), [0, 0.6, 1], [0, 1.06, 1]) }],
  }));
  return {
    onLanded: (opening: boolean) => {
      "worklet";
      if (opening) shown.set(showWithRoom());
    },
    style,
  };
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

/**
 * A stacked row's reactions in its lifted copy, which its parts draw still
 * under them, as in the list, so the copy lines up with the row.
 */
const StillChipsContext = createContext<{
  readonly reactions: readonly ReactionSummary[];
  readonly chipsAtEnd: ReactionPart | null;
} | null>(null);

/** The lifted copy of a stacked row (see `StillChipsContext`). */
export function StillChips({
  reactions,
  chipsAtEnd,
  children,
}: {
  reactions: readonly ReactionSummary[];
  chipsAtEnd: ReactionPart | null;
  children: ReactNode;
}) {
  return (
    <StillChipsContext value={{ chipsAtEnd, reactions }}>
      {children}
    </StillChipsContext>
  );
}

/** Nothing: the lifted copy's chips only show what's there. */
function still() {
  return undefined;
}

/** A part in a lifted copy, with its chips under it when it has its own. */
export function StillPart({
  part,
  children,
}: {
  part: ReactionPart;
  children: ReactNode;
}) {
  const copy = use(StillChipsContext);
  const reactions = copy === null ? [] : reactionsOn(copy.reactions, part);
  if (copy === null || part === copy.chipsAtEnd || reactions.length === 0) {
    return children;
  }
  return (
    <View className="items-start self-stretch">
      {children}
      <View className="self-stretch">
        <ChipRow
          reactions={reactions}
          align="start"
          onToggle={still}
          onHold={still}
        />
      </View>
    </View>
  );
}
