import type { ReactNode } from "react";
import { Alert, Pressable, Text } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import type { Message } from "./types";
import { SymbolIcon } from "~/components/symbol-icon";
import { deleteOutgoing, retryOutgoing } from "~/features/messaging/outbox";

function showNotSent(messageId: string) {
  Alert.alert(
    "Message Not Sent",
    undefined,
    [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => deleteOutgoing(messageId),
        style: "destructive",
        text: "Delete",
      },
      { onPress: () => retryOutgoing(messageId), text: "Try Again" },
    ],
    { cancelable: true },
  );
}

/**
 * Fades a message in from translucent while it is sending, so a confirmed
 * send settles in place instead of swapping a "Sending…" label.
 */
export function SendingFade({
  status,
  children,
}: {
  status: Message["status"];
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(status === "sending" ? 0.75 : 1, { duration: 220 }),
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * "Delivered" under your newest message, or "Not sent", which you tap to
 * try again or delete the message.
 */
export function MessageMeta({
  message,
  delivered,
}: {
  message: Message;
  delivered: boolean;
}) {
  if (message.status === "failed") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Try again or delete the message"
        onPress={() => showNotSent(message.id)}
        hitSlop={8}
        className="flex-row items-center gap-1 px-1 active:opacity-60"
      >
        <SymbolIcon
          name={{ android: "error", ios: "exclamationmark.circle.fill" }}
          size={12}
          tintColorClassName="accent-destructive"
        />
        <Text className="text-caption text-destructive">
          Not sent. Tap to try again.
        </Text>
      </Pressable>
    );
  }
  if (!delivered) return null;
  return (
    <Animated.Text
      entering={FadeIn.duration(240)}
      className="text-caption text-muted px-1 pt-0.5 font-medium"
    >
      Delivered
    </Animated.Text>
  );
}
