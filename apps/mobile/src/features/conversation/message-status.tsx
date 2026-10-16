import type { ReactNode } from "react";
import { Alert, Pressable, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

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

/** How see-through a message is until the PDS has it. */
export const SENDING_OPACITY = 0.5;
/** How long a sent message (or its time) takes to fade up to full. */
export const SENT_FADE_MS = 300;

/**
 * Holds a message at half opacity while it is sending, then fades it up
 * to full once the PDS has it, instead of a "Sending…" or "Delivered" label.
 */
export function SendingFade({
  status,
  children,
}: {
  status: Message["status"];
  children: ReactNode;
}) {
  return (
    <Animated.View
      style={{
        opacity: status === "sending" ? SENDING_OPACITY : 1,
        transitionDuration: SENT_FADE_MS,
        transitionProperty: "opacity",
        transitionTimingFunction: "ease-out",
      }}
    >
      {children}
    </Animated.View>
  );
}

/** "Not sent" under a message that failed: tap to try again or delete it. */
export function NotSent({ message }: { message: Message }) {
  if (message.status !== "failed") return null;
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Try again or delete the message"
        onPress={() => showNotSent(message.id)}
        hitSlop={8}
        className="flex-row items-center gap-1 px-1 pt-0.5 active:opacity-60"
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
    </Animated.View>
  );
}
