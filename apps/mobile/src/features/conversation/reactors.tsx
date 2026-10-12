import type { SharedValue } from "react-native-reanimated";
import { FlatList, Text, View } from "react-native";
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
import {
  REACTOR_ROW_HEIGHT,
  reactorRows,
  REACTORS_PADDING,
  REACTORS_WIDTH,
  reactorsHeight,
} from "./reactor-rows";

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
        <FlatList
          data={rows}
          keyExtractor={({ account, emoji }) => `${emoji} ${account}`}
          contentContainerStyle={{ paddingVertical: REACTORS_PADDING }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: { account, emoji } }) => {
            const { avatarUrl, displayName } = profileOf(account);
            return (
              <View
                accessible
                accessibilityLabel={`${account === address ? "You" : displayName} reacted ${emoji}`}
                className="flex-row items-center gap-3 px-4"
                style={{ height: REACTOR_ROW_HEIGHT }}
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
          }}
        />
      </GlassSurface>
    </Animated.View>
  );
}
