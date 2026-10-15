import type { SharedValue } from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { HOME_PAGES } from "./pages";

/** Each tab's width; the indicator slides between their centers. */
const TAB_WIDTH = 84;
const INDICATOR_WIDTH = 28;
/** How faint a tab is while its page is off screen. */
const INACTIVE_OPACITY = 0.45;

function Tab({
  index,
  label,
  position,
  selected,
  onPress,
}: {
  index: number;
  label: string;
  position: SharedValue<number>;
  selected: boolean;
  onPress: () => void;
}) {
  // Brightens as its page slides in, following the finger.
  const style = useAnimatedStyle(() => ({
    opacity:
      1 -
      Math.min(1, Math.abs(position.get() - index)) * (1 - INACTIVE_OPACITY),
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="h-full items-center justify-center"
      style={{ width: TAB_WIDTH }}
    >
      <Animated.View style={style}>
        <Text className="text-headline text-foreground font-semibold">
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Home's tabs, in the header's title spot as on X's home screen: each
 * page's name over an accent bar that tracks the pager as it's swiped.
 * `position` is the pager's page, fractional mid-swipe.
 */
export function HomeTabs({
  page,
  position,
  onSelect,
}: {
  page: number;
  position: SharedValue<number>;
  onSelect: (index: number) => void;
}) {
  const indicator = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          position.get() * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2,
      },
    ],
  }));
  return (
    <View accessibilityRole="tablist" className="h-10 flex-row">
      {HOME_PAGES.map((item, index) => (
        <Tab
          key={item.key}
          index={index}
          label={item.label}
          position={position}
          selected={page === index}
          onPress={() => onSelect(index)}
        />
      ))}
      <Animated.View
        className="bg-accent absolute bottom-0 left-0 h-[3px] rounded-full"
        style={[{ width: INDICATOR_WIDTH }, indicator]}
      />
    </View>
  );
}
