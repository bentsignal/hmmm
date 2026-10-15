import { Pressable, Text, View } from "react-native";
import Animated, { Keyframe, ZoomOut } from "react-native-reanimated";

import type { ReactionSummary } from "~/features/messaging/reactions";
import { useAccount } from "~/features/messaging/account";
import { cn } from "~/lib/cn";

/** A tapback bubble's diameter. */
const SIZE = 30;
/** The emoji fills most of it, as in Messages. */
const EMOJI_SIZE = 18;
/** The thought-bubble tail: a small bubble tucked into it, and a dot. */
const TAIL = 10;
const DOT = 5;
/** Each tapback behind the front one peeks out this far. */
const STACK_OFFSET = 13;
/** At most this many tapbacks show, the newest in front. */
const MAX_SHOWN = 3;
/** How far the front tapback reaches down over the bubble's top. */
const OVERLAP = Math.round(SIZE * 0.25);
/** How far past the bubble's side the front tapback's center sits. */
const CENTER_INSET = Math.round(SIZE * 0.1);

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
 * One tapback: a round bubble the color of a message bubble (yours blue),
 * the emoji filling it. The front one trails a thought-bubble tail away
 * from the message's corner. A thin ring the page's color keeps it apart
 * from the bubble and the tapbacks it overlaps.
 */
function TapbackBubble({
  tapback,
  incoming,
  tail,
}: {
  tapback: Tapback;
  incoming: boolean;
  tail: boolean;
}) {
  const fill = tapback.mine ? "bg-bubble-outgoing" : "bg-bubble-incoming";
  const side = incoming ? "right" : "left";
  return (
    <Animated.View
      entering={POP_IN}
      exiting={POP_OUT}
      style={{ height: SIZE, width: SIZE }}
    >
      {tail && (
        <>
          <View
            className={cn("border-background absolute rounded-full", fill)}
            style={{
              borderWidth: 1.5,
              height: TAIL,
              [side]: -2,
              top: SIZE - TAIL + 2,
              width: TAIL,
            }}
          />
          <View
            className={cn("absolute rounded-full", fill)}
            style={{
              height: DOT,
              [side]: -DOT - 1,
              top: SIZE + 3,
              width: DOT,
            }}
          />
        </>
      )}
      <View
        className={cn(
          "border-background items-center justify-center rounded-full",
          fill,
        )}
        style={{ borderWidth: 1.5, height: SIZE, width: SIZE }}
      >
        <Text style={{ fontSize: EMOJI_SIZE, lineHeight: EMOJI_SIZE + 4 }}>
          {tapback.emoji}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Messages' tapbacks: a small round bubble per reaction over the message's
 * top corner on the side facing the middle of the screen (top right of
 * someone else's message, top left of yours), the newest in front at the
 * corner and up to two more fanned out behind it. Sits in `TAPBACK_SPACE`
 * above the bubble; tapping shows who reacted.
 */
export function Tapbacks({
  reactions,
  align,
  hidden,
  onPress,
}: {
  reactions: readonly ReactionSummary[];
  /** The side the message sits on. */
  align: "end" | "start";
  /** While the message is lifted into its menu, which shows them itself. */
  hidden: boolean;
  onPress: () => void;
}) {
  const { address } = useAccount();
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
      className="absolute top-0"
      style={{
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
          <TapbackBubble
            tapback={tapback}
            incoming={incoming}
            tail={index === shown.length - 1}
          />
        </View>
      ))}
    </Pressable>
  );
}
