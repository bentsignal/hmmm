import type { ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";

import { Entrance } from "./entrance";
import { GrowingSpace } from "./grow";

/**
 * A line a row shows from some point while it's on screen, under the
 * message (a thread's count after its first reply, "Not sent"). `late`
 * (see `useChangedSinceMount`, from what's always mounted), its space
 * opens as reactions' does (see `GrowingSpace`), the messages above
 * easing up out of its way, and it fades in; shown as a plain view, the
 * rows above jumped up by its height. There when the row appeared, it's
 * just there.
 */
export function Appearing({
  late,
  children,
  ...space
}: LineSpace & { late: boolean; children: ReactNode }) {
  if (!late) return children;
  return <LateLine {...space}>{children}</LateLine>;
}

/** Where an appearing line's space is. */
interface LineSpace {
  /** The row's order (see `useRowOrder`). */
  order: number;
  /** Where in the row its space is (see `Place`). */
  place: number;
  /**
   * The gap its column puts before it, which its space takes in, so that
   * doesn't open at once as it mounts.
   */
  gap?: number;
}

/**
 * A line appearing: laid out out of sight first, at no height, then its
 * space opens to its height.
 */
function LateLine({
  order,
  place,
  gap = 0,
  children,
}: LineSpace & { children: ReactNode }) {
  const measured = useAnimatedRef<View>();
  const [height, setHeight] = useState(0);
  function onLayout(event: LayoutChangeEvent) {
    setHeight(event.nativeEvent.layout.height);
  }
  return (
    <Animated.View
      ref={measured}
      // Across its column while it's laid out out of sight, so it has the
      // width to lay out in: on its own, it would have none.
      style={{
        alignSelf: height === 0 ? "stretch" : undefined,
        marginTop: -gap,
      }}
    >
      {height === 0 && (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 top-0 opacity-0"
          onLayout={onLayout}
        >
          {children}
        </View>
      )}
      <GrowingSpace
        height={height === 0 ? 0 : height + gap}
        order={order}
        place={place}
        animate
        early
        measured={measured}
      >
        {height > 0 && (
          <View style={{ marginTop: gap }}>
            <Entrance kind="fade">{children}</Entrance>
          </View>
        )}
      </GrowingSpace>
    </Animated.View>
  );
}
