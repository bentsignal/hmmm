import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Keyframe, ZoomOut } from "react-native-reanimated";

import type { ReactionSummary } from "~/features/messaging/reactions";
import { useAccount } from "~/features/messaging/account";
import { cn } from "~/lib/cn";

/** A tapback bubble's diameter. */
const SIZE = 34;
/** The emoji, with room around it inside the bubble. */
const EMOJI_SIZE = 18;
/** The fine ring, the page's color, that sets it apart from what it overlaps. */
const RING = 1;
/** Each tapback behind the front one peeks out this far. */
const STACK_OFFSET = 14;
/** At most this many tapbacks show, the newest in front. */
const MAX_SHOWN = 3;
/** How far the front tapback reaches down over the bubble's top. */
const OVERLAP = Math.round(SIZE * 0.25);
/** How far past the bubble's side the front tapback's center sits. */
const CENTER_INSET = Math.round(SIZE * 0.1);

/** The space kept between the sender's name and tapbacks beside it. */
const NAME_CLEARANCE = 6;

/** The room tapbacks need above a bubble. */
export const TAPBACK_SPACE = SIZE - OVERLAP;

const POP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.3 }] },
  60: { opacity: 1, transform: [{ scale: 1.12 }] },
  100: { transform: [{ scale: 1 }] },
}).duration(320);
const POP_OUT = ZoomOut.duration(160);

/** One person's reaction, newest last. */
interface Tapback {
  readonly key: string;
  readonly emoji: string;
  readonly mine: boolean;
}

/**
 * Every reaction as its own tapback (two people who sent ❤️ show two),
 * newest last.
 */
function tapbacksOf(reactions: readonly ReactionSummary[], self: string) {
  return reactions.flatMap((reaction) =>
    reaction.accounts.map(
      (account) =>
        ({
          emoji: reaction.emoji,
          key: `${reaction.emoji} ${account}`,
          mine: account === self,
        }) satisfies Tapback,
    ),
  );
}

/**
 * One tapback: a round bubble the color of a message bubble (yours blue)
 * with the emoji in the middle, and a fine ring the page's color that keeps
 * it apart from the bubble and the tapbacks it overlaps.
 */
function TapbackBubble({ tapback }: { tapback: Tapback }) {
  return (
    <Animated.View
      entering={POP_IN}
      exiting={POP_OUT}
      className={cn(
        "border-background items-center justify-center rounded-full",
        tapback.mine ? "bg-bubble-outgoing" : "bg-bubble-incoming",
      )}
      style={{ borderWidth: RING, height: SIZE, width: SIZE }}
    >
      <Text style={{ fontSize: EMOJI_SIZE, lineHeight: EMOJI_SIZE + 4 }}>
        {tapback.emoji}
      </Text>
    </Animated.View>
  );
}

/**
 * Messages' tapbacks: a small round bubble per reaction over the message's
 * top corner on the side facing the middle of the screen (top right of
 * someone else's message, top left of yours), the newest in front at the
 * corner and up to two more fanned out behind it. Put it in the bubble's
 * box: it rises `TAPBACK_SPACE` above the bubble's top, into room the row
 * leaves there. Tapping shows who reacted.
 */
export function Tapbacks({
  reactions,
  align,
  hidden,
  clearOf,
  onPress,
}: {
  reactions: readonly ReactionSummary[];
  /** The side the message sits on. */
  align: "end" | "start";
  /** While the message is lifted into its menu, which shows them itself. */
  hidden: boolean;
  /**
   * Where the sender's name above the bubble ends, from the bubble's left:
   * tapbacks rising beside it move past it rather than cover it.
   */
  clearOf?: number;
  onPress: () => void;
}) {
  const { address } = useAccount();
  // Where they'd sit, unmoved, from the bubble's left.
  const [left, setLeft] = useState<number>();
  // How far right to move to clear the name.
  const shift =
    clearOf === undefined || left === undefined
      ? 0
      : Math.max(0, clearOf + NAME_CLEARANCE - left);
  const shown = tapbacksOf(reactions, address).slice(-MAX_SHOWN);
  const incoming = align === "start";
  const label = reactions
    .map((reaction) => `${reaction.emoji} ${reaction.count}`)
    .join(", ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reactions: ${label}`}
      accessibilityHint="Shows who reacted"
      onPress={onPress}
      hitSlop={6}
      className="absolute"
      // Measured where they'd sit, unmoved: the shift is a transform.
      onLayout={(event) => setLeft(event.nativeEvent.layout.x)}
      style={{
        top: -TAPBACK_SPACE,
        transform: [{ translateX: shift }],
        [incoming ? "right" : "left"]: CENTER_INSET - SIZE / 2,
        // Behind the front one, toward the middle of the bubble.
        flexDirection: incoming ? "row" : "row-reverse",
        opacity: hidden ? 0 : 1,
        transitionDuration: 200,
        transitionProperty: "opacity",
      }}
    >
      {shown.map((tapback, index) => (
        <View
          key={tapback.key}
          style={{
            [incoming ? "marginLeft" : "marginRight"]:
              index === 0 ? 0 : STACK_OFFSET - SIZE,
          }}
        >
          <TapbackBubble tapback={tapback} />
        </View>
      ))}
    </Pressable>
  );
}
