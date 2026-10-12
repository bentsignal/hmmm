import type { ReactNode, RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useCSSVariable } from "uniwind";

export type PagerRef = RefObject<Animated.ScrollView | null>;

/** One of `HomePager`'s pages, as wide as the screen. */
export function PagerPage({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  return <View style={{ width }}>{children}</View>;
}

/**
 * Home's `PagerPage`s side by side, swiped between like X's home
 * timelines. It keeps `position` on the current page (fractional
 * mid-swipe) and calls `onPageChange` once a swipe passes the halfway
 * point, so the header and its buttons switch while the finger is down.
 */
export function HomePager({
  pagerRef,
  position,
  onPageChange,
  children,
}: {
  pagerRef: PagerRef;
  position: SharedValue<number>;
  onPageChange: (index: number) => void;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  // The lists' background, so a page that's still loading isn't gray.
  const background = useCSSVariable("--color-background");
  const onScroll = useAnimatedScrollHandler((event) => {
    if (width > 0) position.set(event.contentOffset.x / width);
  });
  useAnimatedReaction(
    () => Math.round(position.get()),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(onPageChange, now);
    },
  );
  return (
    <Animated.ScrollView
      ref={pagerRef}
      horizontal
      pagingEnabled
      // Each page's list takes the header and tab bar insets itself.
      contentInsetAdjustmentBehavior="never"
      bounces={false}
      overScrollMode="never"
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      style={{
        backgroundColor:
          typeof background === "string" ? background : undefined,
        flex: 1,
      }}
    >
      {children}
    </Animated.ScrollView>
  );
}
