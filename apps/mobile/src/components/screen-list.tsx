import type {
  LegendListProps,
  LegendListRef,
} from "@legendapp/list/react-native";
import type { Ref } from "react";
import { use } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { LegendList } from "@legendapp/list/react-native";
import { useCSSVariable } from "uniwind";

import { ScreenListInsets } from "./screen-list-insets";

/** How far past the screen, in points, rows are drawn ahead of time. */
const DRAW_DISTANCE = 1000;

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
  const insets = use(ScreenListInsets);
  if (!ready) return null;
  const inset =
    insets === null ? undefined : { bottom: insets.bottom, top: insets.top };
  return (
    <Animated.View entering={FadeIn.duration(260)} style={{ flex: 1 }}>
      <LegendList
        ref={ref}
        contentInsetAdjustmentBehavior={insets === null ? "automatic" : "never"}
        // As padding, which Legend List measures, not a native content
        // inset, which it counts again: a short list would scroll by it.
        contentContainerStyle={
          inset === undefined
            ? undefined
            : { paddingBottom: inset.bottom, paddingTop: inset.top }
        }
        scrollIndicatorInsets={inset}
        // A short list still gives under the finger, as a table view does.
        alwaysBounceVertical={inset !== undefined}
        keyboardDismissMode="on-drag"
        estimatedItemSize={72}
        // Rows are drawn well ahead of the scroll, so a fast fling on a slow
        // phone doesn't outrun them and show them appearing at the edges.
        drawDistance={DRAW_DISTANCE}
        recycleItems={false}
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
