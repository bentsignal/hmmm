import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

/** How long space for something new takes to open or close. */
export const EXPAND_MS = 240;

/**
 * Space that opens smoothly to fit `children` when `open`, and closes when
 * not, so a row that gains something (a reaction) grows instead of jumping,
 * and the messages around it move with it. `children` keep their natural
 * height inside, as wide as the space, and are revealed as it opens.
 *
 * Mount it only for something that arrives while the conversation is open;
 * what's already there when a row appears should just be there.
 */
export function Expand({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [natural, setNatural] = useState(0);
  return (
    <Animated.View
      style={{
        height: open ? natural : 0,
        overflow: "hidden",
        transitionDuration: EXPAND_MS,
        transitionProperty: "height",
        transitionTimingFunction: "ease-out",
      }}
    >
      <View
        // Laid out on its own, as wide as the space, so it has its full
        // height however much of it the space shows yet.
        style={{ left: 0, position: "absolute", right: 0, top: 0 }}
        onLayout={(event) => setNatural(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}
