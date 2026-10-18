import { Pressable, Text, View } from "react-native";
import {
  Directions,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ProfileOf } from "./message-row";
import { SymbolIcon } from "~/components/symbol-icon";
import { typingLabel } from "~/features/messaging/typing-state";
import { selectionTick } from "~/lib/native-extras";
import { CONVERSATION_HEADER_HEIGHT } from "./conversation-header";
import { TypingSummary } from "./typing-parts";
import {
  stepTypingStyle,
  TYPING_STYLES,
  useTypingStyle,
  useTypingStyleIndex,
} from "./typing-style";

// Development only: the pill that flips between typing styles, and the
// header chip one of them shows typing in (see `TYPING_STYLES`).

/** The chip's height, so the picker sits under it. */
const CHIP = 30;

function step(by: number) {
  selectionTick();
  stepTypingStyle(by);
}

function Arrow({ by }: { by: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        by < 0 ? "Previous typing style" : "Next typing style"
      }
      hitSlop={8}
      onPress={() => step(by)}
      className="size-8 items-center justify-center active:opacity-50"
    >
      <SymbolIcon
        name={
          by < 0
            ? { android: "chevron_left", ios: "chevron.left" }
            : { android: "chevron_right", ios: "chevron.right" }
        }
        size={13}
        weight="bold"
        tintColorClassName="accent-foreground"
      />
    </Pressable>
  );
}

function Picker({ top }: { top: number }) {
  const index = useTypingStyleIndex();
  const style = TYPING_STYLES[index];
  const swipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => step(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => step(-1)),
  );
  if (style === undefined) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ top }}
    >
      <GestureDetector gesture={swipe}>
        <View className="bg-background-elevated border-separator flex-row items-center rounded-full border px-1 py-1">
          <Arrow by={-1} />
          <View className="w-[240px] items-center">
            <Text className="text-footnote text-foreground font-semibold">
              Typing {index + 1}/{TYPING_STYLES.length} · {style.name}
            </Text>
            <Text numberOfLines={1} className="text-caption text-muted">
              {style.note}
            </Text>
          </View>
          <Arrow by={1} />
        </View>
      </GestureDetector>
    </View>
  );
}

/**
 * WhatsApp/Telegram-style: who's typing, in a chip under the header,
 * fading in and out over the messages without moving them.
 */
function HeaderChip({
  typists,
  profileOf,
  top,
}: {
  typists: readonly string[];
  profileOf: ProfileOf;
  top: number;
}) {
  const people = typists.map((address) => ({
    address,
    ...profileOf(address),
  }));
  const label = typingLabel(people.map((person) => person.displayName));
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center"
      style={{ top }}
    >
      {people.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(220)}
          layout={LinearTransition.duration(220)}
          accessible
          accessibilityLabel={label}
          accessibilityLiveRegion="polite"
          className="bg-background-elevated border-separator flex-row items-center gap-2 rounded-full border px-3"
          style={{ height: CHIP }}
        >
          <LayoutAnimationConfig skipEntering>
            <TypingSummary people={people} label={label} />
          </LayoutAnimationConfig>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Development only: the typing style picker, and the header chip when the
 * picked style shows typing there.
 */
export function TypingStyleControls({
  typists,
  profileOf,
  headerHeight = CONVERSATION_HEADER_HEIGHT,
}: {
  typists: readonly string[];
  profileOf: ProfileOf;
  /** The header's height below the status bar. */
  headerHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  const style = useTypingStyle();
  if (!__DEV__) return null;
  const top = insets.top + headerHeight + 6;
  return (
    <>
      {style.place === "header" && (
        <HeaderChip typists={typists} profileOf={profileOf} top={top} />
      )}
      <Picker top={top + CHIP + 8} />
    </>
  );
}
