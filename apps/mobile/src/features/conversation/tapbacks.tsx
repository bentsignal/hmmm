import { Pressable, Text, View } from "react-native";
import Animated, { Keyframe, ZoomOut } from "react-native-reanimated";

import type { ReactionSummary } from "~/features/messaging/reactions";
import { cn } from "~/lib/cn";

/** A tapback's diameter, including the ring that cuts it out of the bubble. */
export const TAPBACK_SIZE = 32;
/** How far tapbacks reach down over the bubble's top corner. */
export const TAPBACK_OVERLAP = 12;
/** How far tapbacks hang out past the bubble's side. */
const TAPBACK_OVERHANG = 10;
/** Each tapback after the first tucks this far under the one before. */
const STACK_OFFSET = 14;
/** At most this many emoji show; a count covers the rest. */
const MAX_SHOWN = 3;

const POP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.4 }] },
  60: { opacity: 1, transform: [{ scale: 1.12 }] },
  100: { transform: [{ scale: 1 }] },
}).duration(300);
const POP_OUT = ZoomOut.duration(140);

function Tapback({ reaction }: { reaction: ReactionSummary }) {
  return (
    <Animated.View
      entering={POP_IN}
      exiting={POP_OUT}
      className={cn(
        "border-background items-center justify-center rounded-full border-2",
        reaction.mine ? "bg-accent" : "bg-bubble-incoming",
      )}
      style={{ height: TAPBACK_SIZE, width: TAPBACK_SIZE }}
    >
      <Text style={{ fontSize: 15 }}>{reaction.emoji}</Text>
    </Animated.View>
  );
}

/**
 * iMessage's tapbacks: each emoji in a small round bubble, stacked over
 * the message's top corner on the side facing the middle of the screen
 * (top right of someone else's message, top left of yours). Yours are
 * tinted. Past three emoji, or when several people used one, a count
 * shows how many reactions there are in all. Tapping shows who reacted.
 */
export function Tapbacks({
  reactions,
  align,
  onPress,
}: {
  reactions: readonly ReactionSummary[];
  /** The side the message sits on. */
  align: "end" | "start";
  onPress: () => void;
}) {
  const shown = reactions.slice(0, MAX_SHOWN);
  const total = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
  const label = reactions
    .map((reaction) => `${reaction.emoji} ${reaction.count}`)
    .join(", ");
  const incoming = align === "start";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reactions: ${label}`}
      accessibilityHint="Shows who reacted"
      onPress={onPress}
      hitSlop={6}
      className={cn("z-10 items-center", incoming ? "self-end" : "self-start")}
      style={{
        marginBottom: -TAPBACK_OVERLAP,
        // Toward the middle of the screen, past the bubble's corner.
        marginLeft: incoming ? 0 : -TAPBACK_OVERHANG,
        marginRight: incoming ? -TAPBACK_OVERHANG : 0,
        // The first emoji sits at the corner, on top of the stack, and the
        // rest tuck under it toward the middle of the bubble.
        flexDirection: incoming ? "row-reverse" : "row",
      }}
    >
      {shown.map((reaction, index) => (
        <View
          key={reaction.emoji}
          style={{
            [incoming ? "marginRight" : "marginLeft"]:
              index === 0 ? 0 : -STACK_OFFSET,
            zIndex: MAX_SHOWN - index,
          }}
        >
          <Tapback reaction={reaction} />
        </View>
      ))}
      {total > shown.length && (
        <Text
          className="text-caption text-muted font-semibold"
          style={{ marginHorizontal: 4 }}
        >
          {total}
        </Text>
      )}
    </Pressable>
  );
}
