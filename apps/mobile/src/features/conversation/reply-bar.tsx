import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { SymbolIcon } from "~/components/symbol-icon";

/** Who and what the next message replies to, shown over the field. */
export interface ReplyingTo {
  /** Who wrote the message being answered. */
  readonly name: string;
  /** Its text, or what it sent instead. */
  readonly text: string;
}

/**
 * "Replying to Maya" and the message, at the top of the field, with a
 * button to send a plain message instead.
 */
export function ReplyBar({
  replyingTo,
  onCancel,
}: {
  replyingTo: ReplyingTo;
  onCancel: () => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      className="flex-row items-center gap-2 pt-2 pr-2 pl-4"
    >
      <View className="border-accent flex-1 border-l-2 pl-2">
        <Text numberOfLines={1} className="text-caption text-accent">
          Replying to {replyingTo.name}
        </Text>
        <Text numberOfLines={1} className="text-footnote text-muted">
          {replyingTo.text}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel Reply"
        hitSlop={8}
        onPress={onCancel}
        className="active:opacity-60"
      >
        <SymbolIcon
          name={{ android: "close", ios: "xmark.circle.fill" }}
          size={18}
          tintColorClassName="accent-subtle"
        />
      </Pressable>
    </Animated.View>
  );
}
