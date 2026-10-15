import type { SharedValue } from "react-native-reanimated";
import { FlatList, Platform, Pressable, Text, View } from "react-native";
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
import { cn } from "~/lib/cn";
import {
  REACTOR_COLUMN,
  REACTOR_EMOJI,
  REACTOR_FACES,
  reactorColumns,
  REACTORS_GAP,
  REACTORS_HEIGHT,
  REACTORS_PADDING,
} from "./reactor-rows";

const FADE_CONTENT = Platform.OS === "ios";
/** Photos shown under an emoji before a count of the rest. */
const MAX_FACES = 3;

type ProfileOf = ReturnType<typeof useProfiles>;

/** One emoji, and the photos of who used it, overlapping. */
function Column({
  reaction,
  profileOf,
  self,
  onPress,
}: {
  reaction: ReactionSummary;
  profileOf: ProfileOf;
  self: string;
  onPress: () => void;
}) {
  const shown = reaction.accounts.slice(0, MAX_FACES);
  const rest = reaction.accounts.length - shown.length;
  const names = reaction.accounts
    .map((account) =>
      account === self ? "You" : profileOf(account).displayName,
    )
    .join(", ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reaction.emoji}: ${names}`}
      accessibilityHint="Shows everyone who reacted"
      onPress={onPress}
      className="items-center active:opacity-70"
      style={{ gap: REACTORS_GAP, width: REACTOR_COLUMN }}
    >
      <View
        className={cn(
          "items-center justify-center rounded-full",
          reaction.mine ? "bg-accent/25" : "bg-fill",
        )}
        style={{ height: REACTOR_EMOJI, width: REACTOR_EMOJI }}
      >
        <Text style={{ fontSize: 24 }}>{reaction.emoji}</Text>
      </View>
      <View className="flex-row items-center" style={{ height: REACTOR_FACES }}>
        {shown.map((account, index) => {
          const { avatarUrl, displayName } = profileOf(account);
          return (
            <View
              key={account}
              className="border-background-elevated rounded-full border"
              style={{ marginLeft: index === 0 ? 0 : -12, zIndex: -index }}
            >
              <Avatar name={displayName} size="sm" uri={avatarUrl} />
            </View>
          );
        })}
        {rest > 0 && (
          <Text className="text-caption text-muted ml-1 font-semibold">
            +{rest}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Who reacted, as Messages shows it: a glass panel under the lifted
 * message with a column per emoji (yours tinted) and the photos of who
 * used it, so it stays small however many people react. Tapping a column
 * opens everyone who used that emoji. It pops out of the message's corner
 * like the action menu does.
 */
export function Reactors({
  reactions,
  progress,
  closing,
  align,
  position,
  width,
  onPick,
}: {
  reactions: readonly ReactionSummary[];
  progress: SharedValue<number>;
  /** The menu is playing back into place. */
  closing: boolean;
  align: TargetAlign;
  position: { left: number; top: number };
  /** From `reactorsWidth`. */
  width: number;
  /** Opens everyone who reacted with `emoji`. */
  onPick: (emoji: string) => void;
}) {
  const { address } = useAccount();
  const columns = reactorColumns(reactions);
  const profileOf = useProfiles(columns.flatMap((column) => column.accounts));
  // Glass can't fade with its parent (see `GlassSurface`), so on iOS only
  // the columns fade, and the glass materializes on its own.
  const frame = useAnimatedStyle(() => ({
    opacity: FADE_CONTENT
      ? 1
      : interpolate(progress.value, [0, 0.45], [0, 1], "clamp"),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.35, 1]) }],
    transformOrigin: `${align === "end" ? "right" : "left"} top`,
  }));
  const content = useAnimatedStyle(() => ({
    opacity: FADE_CONTENT
      ? interpolate(progress.value, [0, 0.45], [0, 1], "clamp")
      : 1,
  }));
  return (
    <Animated.View className="absolute" style={[{ ...position, width }, frame]}>
      <GlassSurface
        materialize
        shown={!closing}
        className="overflow-hidden rounded-[24px]"
        androidClassName="bg-background-elevated"
        style={{ height: REACTORS_HEIGHT }}
      >
        <Animated.View style={[{ flex: 1 }, content]}>
          <FlatList
            horizontal
            data={columns}
            keyExtractor={(column) => column.emoji}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: REACTORS_PADDING }}
            renderItem={({ item }) => (
              <Column
                reaction={item}
                profileOf={profileOf}
                self={address}
                onPress={() => onPick(item.emoji)}
              />
            )}
          />
        </Animated.View>
      </GlassSurface>
    </Animated.View>
  );
}
