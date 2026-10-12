import type { SharedValue } from "react-native-reanimated";
import { ScrollView, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import type { TargetAlign } from "./glass-message-menu";
import type { ReactionSummary } from "~/features/messaging/reactions";
import { Avatar } from "~/components/avatar";
import { GlassSurface } from "~/components/glass-surface";
import { useAccount } from "~/features/messaging/account";
import { useProfiles } from "~/features/messaging/profiles";

const ROW_HEIGHT = 48;
const PADDING = 6;
/** Rows shown before the list scrolls. */
const MAX_ROWS = 5.5;
export const REACTORS_WIDTH = 260;

/** Each reaction, one row per person, in the order they reacted. */
function reactorRows(reactions: readonly ReactionSummary[]) {
  return reactions.flatMap((reaction) =>
    reaction.accounts.map((account) => ({ account, emoji: reaction.emoji })),
  );
}

/** The panel's height for these reactions, so the menu can place it. */
export function reactorsHeight(reactions: readonly ReactionSummary[]) {
  const rows = reactorRows(reactions).length;
  if (rows === 0) return 0;
  return Math.min(rows, MAX_ROWS) * ROW_HEIGHT + PADDING * 2;
}

/**
 * Who reacted, iMessage-style: a glass panel under the lifted message with
 * each person's photo, name, and emoji. It pops out of the message's corner
 * like the action menu does.
 */
export function Reactors({
  reactions,
  progress,
  align,
  position,
}: {
  reactions: readonly ReactionSummary[];
  progress: SharedValue<number>;
  align: TargetAlign;
  position: { left: number; top: number };
}) {
  const { address } = useAccount();
  const rows = reactorRows(reactions);
  const profileOf = useProfiles(rows.map((row) => row.account));
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [0, 1], "clamp"),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.35, 1]) }],
    transformOrigin: `${align === "end" ? "right" : "left"} top`,
  }));
  return (
    <Animated.View
      className="absolute"
      style={[{ ...position, width: REACTORS_WIDTH }, style]}
    >
      <GlassSurface
        className="overflow-hidden rounded-[24px]"
        androidClassName="bg-background-elevated"
        style={{ height: reactorsHeight(reactions) }}
      >
        <ScrollView
          contentContainerStyle={{ paddingVertical: PADDING }}
          showsVerticalScrollIndicator={false}
        >
          {rows.map(({ account, emoji }) => {
            const { avatarUrl, displayName } = profileOf(account);
            return (
              <View
                key={`${emoji} ${account}`}
                accessible
                accessibilityLabel={`${account === address ? "You" : displayName} reacted ${emoji}`}
                className="flex-row items-center gap-3 px-4"
                style={{ height: ROW_HEIGHT }}
              >
                <Avatar name={displayName} size="sm" uri={avatarUrl} />
                <Text
                  numberOfLines={1}
                  className="text-body text-foreground flex-1"
                >
                  {account === address ? "You" : displayName}
                </Text>
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </View>
            );
          })}
        </ScrollView>
      </GlassSurface>
    </Animated.View>
  );
}
