import type { LegendListProps } from "@legendapp/list/react-native";
import { use } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { LegendList } from "@legendapp/list/react-native";
import { useCSSVariable } from "uniwind";

import { ScreenListInsets } from "./screen-list-insets";

/**
 * A full-screen Legend List under a native header, so large titles collapse
 * as it scrolls and its background follows the theme. It shows nothing
 * until `ready`, then fades in: loading content never pops in.
 */
export function ScreenList<Item>({
  ready = true,
  ...props
}: LegendListProps<Item> & { ready?: boolean }) {
  const background = useCSSVariable("--color-background");
  const insets = use(ScreenListInsets);
  if (!ready) return null;
  const inset =
    insets === null ? undefined : { bottom: insets.bottom, top: insets.top };
  return (
    <Animated.View entering={FadeIn.duration(260)} style={{ flex: 1 }}>
      <LegendList
        contentInsetAdjustmentBehavior={insets === null ? "automatic" : "never"}
        contentInset={inset}
        scrollIndicatorInsets={inset}
        keyboardDismissMode="on-drag"
        estimatedItemSize={72}
        {...props}
        style={[
          {
            backgroundColor:
              typeof background === "string" ? background : undefined,
            flex: 1,
          },
          props.style,
        ]}
      />
    </Animated.View>
  );
}
