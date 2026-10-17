import { Pressable, Text, View } from "react-native";
import {
  Directions,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MessageLayout } from "~/features/preferences/store";
import { SymbolIcon } from "~/components/symbol-icon";
import { selectionTick } from "~/lib/native-extras";
import { CONVERSATION_HEADER_HEIGHT } from "./conversation-header";
import {
  STACKED_STYLES,
  stepStackedStyle,
  useStackedStyleIndex,
} from "./stacked-style";

function step(by: number) {
  selectionTick();
  stepStackedStyle(by);
}

function Arrow({ by }: { by: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={by < 0 ? "Previous style" : "Next style"}
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

/**
 * Development only: a pill under a stacked conversation's header naming
 * the row style (see `STACKED_STYLES`). Swipe it, or tap its arrows, to
 * try the next one.
 */
export function StackedStylePicker({
  layout,
}: {
  layout: MessageLayout | undefined;
}) {
  if (!__DEV__ || layout !== "stacked") return null;
  return <Picker />;
}

function Picker() {
  const insets = useSafeAreaInsets();
  const index = useStackedStyleIndex();
  const style = STACKED_STYLES[index];
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
      style={{ top: insets.top + CONVERSATION_HEADER_HEIGHT + 6 }}
    >
      <GestureDetector gesture={swipe}>
        <View className="bg-background-elevated border-separator flex-row items-center rounded-full border px-1 py-1 shadow-md">
          <Arrow by={-1} />
          <View className="w-[220px] items-center">
            <Text className="text-footnote text-foreground font-semibold">
              {index + 1}/{STACKED_STYLES.length} · {style.name}
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
