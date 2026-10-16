import { Pressable, View } from "react-native";
import Animated, {
  Keyframe,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomOut,
} from "react-native-reanimated";

import type { ReactionSummary } from "~/features/messaging/reactions";
import { Emoji } from "~/components/emoji";
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
export const NAME_CLEARANCE = 6;

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
      <Emoji emoji={tapback.emoji} size={EMOJI_SIZE} />
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
  inset = 0,
  onPlaced,
  onPress,
}: {
  reactions: readonly ReactionSummary[];
  /** The side the message sits on. */
  align: "end" | "start";
  /** While the message is lifted into its menu, which shows them itself. */
  hidden: boolean;
  /** How far in from the message's edge its top part's corner is. */
  inset?: number;
  /** Where their left edge sits, from the bubble's left. */
  onPlaced?: (left: number) => void;
  onPress: () => void;
}) {
  const { address } = useAccount();
  const shown = tapbacksOf(reactions, address).slice(-MAX_SHOWN);
  const incoming = align === "start";
  const label = reactions
    .map((reaction) => `${reaction.emoji} ${reaction.count}`)
    .join(", ");
  const fade = useHiddenFade(hidden);
  return (
    <Animated.View
      className="absolute"
      onLayout={(event) => onPlaced?.(event.nativeEvent.layout.x)}
      style={[
        incoming
          ? { right: CENTER_INSET - SIZE / 2 + inset, top: -TAPBACK_SPACE }
          : { left: CENTER_INSET - SIZE / 2 + inset, top: -TAPBACK_SPACE },
        fade,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reactions: ${label}`}
        accessibilityHint="Shows who reacted"
        onPress={onPress}
        hitSlop={6}
        // Behind the front one, toward the middle of the bubble.
        style={{ flexDirection: incoming ? "row" : "row-reverse" }}
      >
        {shown.map((tapback, index) => (
          <View
            key={tapback.key}
            style={
              incoming
                ? { marginLeft: index === 0 ? 0 : STACK_OFFSET - SIZE }
                : { marginRight: index === 0 ? 0 : STACK_OFFSET - SIZE }
            }
          >
            <TapbackBubble tapback={tapback} />
          </View>
        ))}
      </Pressable>
    </Animated.View>
  );
}

/** How long tapbacks take to fade back in after the menu closes. */
const RETURN_MS = 260;

/**
 * Hidden at once while the message is lifted into its menu (the menu shows
 * its own copy), and faded back in once it's back in place.
 */
function useHiddenFade(hidden: boolean) {
  const opacity = useSharedValue(hidden ? 0 : 1);
  useAnimatedReaction(
    () => hidden,
    (now, before) => {
      if (before === null || now === before) return;
      opacity.set(now ? 0 : withTiming(1, { duration: RETURN_MS }));
    },
    [hidden],
  );
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
