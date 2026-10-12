import type {
  LegendListProps,
  LegendListRef,
} from "@legendapp/list/react-native";
import type { Ref } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { LegendList } from "@legendapp/list/react-native";
import { useCSSVariable } from "uniwind";

/**
 * A full-screen Legend List under a native header, so large titles collapse
 * as it scrolls and its background follows the theme. It shows nothing
 * until `ready`, then fades in: loading content never pops in.
 */
export function ScreenList<Item>({
  ready = true,
  ref,
  ...props
}: LegendListProps<Item> & { ready?: boolean; ref?: Ref<LegendListRef> }) {
  const background = useCSSVariable("--color-background");
  if (!ready) return null;
  return (
    <Animated.View entering={FadeIn.duration(260)} style={{ flex: 1 }}>
      <LegendList
        ref={ref}
        contentInsetAdjustmentBehavior="automatic"
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
