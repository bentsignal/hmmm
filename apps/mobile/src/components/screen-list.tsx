import type {
  LegendListProps,
  LegendListRef,
} from "@legendapp/list/react-native";
import type { Ref } from "react";
import { use } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { LegendList } from "@legendapp/list/react-native";
import { useCSSVariable } from "uniwind";

import { Pending, usePending } from "./pending";
import { ScreenListInsets } from "./screen-list-insets";
import { useSteadyData } from "./steady-data";

/** How far past the screen, in points, rows are drawn ahead of time. */
const DRAW_DISTANCE = 1000;

/**
 * A full-screen Legend List under a native header, so large titles collapse
 * as it scrolls and its background follows the theme. Until `ready` it
 * shows what `usePending` says (nothing, unless loading is slow), then
 * fades in: loading content never pops in.
 */
export function ScreenList<Item>({
  ready = true,
  ref,
  steady = false,
  ...props
}: LegendListProps<Item> & {
  ready?: boolean;
  ref?: Ref<LegendListRef>;
  /** Rows don't move under the finger as data changes (`useSteadyData`). */
  steady?: boolean;
}) {
  const background = useCSSVariable("--color-background");
  const insets = use(ScreenListInsets);
  const held = useSteadyData(props.data);
  const pending = usePending(!ready);
  if (pending !== "ready") return <Pending phase={pending} />;
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
        {...(steady && { ...held.listProps, data: held.data })}
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
