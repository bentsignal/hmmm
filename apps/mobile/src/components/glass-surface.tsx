import type { GlassEffectStyleConfig, GlassViewProps } from "expo-glass-effect";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useState } from "react";
import { Platform, View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { withUniwind } from "uniwind";

import { cn } from "~/lib/cn";

/**
 * `withUniwind` treats every prop ending in `Style` as a style and turns it
 * into an array, which `glassEffectStyle` can't take, so it passes through
 * as `effect`.
 */
function Glass({
  effect,
  ...props
}: Omit<GlassViewProps, "glassEffectStyle"> & {
  effect: GlassEffectStyleConfig;
}) {
  return <GlassView glassEffectStyle={effect} {...props} />;
}

const StyledGlassView = withUniwind(Glass);

/** How long the glass takes to materialize or dissolve, in seconds. */
const GLASS_SECONDS = 0.25;

/**
 * Liquid Glass on iOS. Android has no glass (`GlassView` is a plain view
 * there), so the same surface gets a Material tonal fill instead of
 * nothing: `bg-fill` unless `androidClassName` says otherwise.
 *
 * Never fade a parent of this: glass under a parent with opacity below 1
 * often doesn't draw, and stays blank until it remounts. Fade the children
 * instead, and bring the glass itself in with `materialize` and out with
 * `shown`.
 */
export function GlassSurface({
  className,
  androidClassName,
  style,
  isInteractive,
  tintColorClassName,
  shown = true,
  materialize = false,
  children,
}: {
  className?: string;
  androidClassName?: string;
  style?: StyleProp<ViewStyle>;
  isInteractive?: boolean;
  /** iOS only: tints the glass, as for a selected reaction. */
  tintColorClassName?: string;
  /** iOS only: false dissolves the glass, as when a menu closes. */
  shown?: boolean;
  /** iOS only: the glass materializes once laid out, rather than being there from the first frame. */
  materialize?: boolean;
  children?: ReactNode;
}) {
  const [laidOut, setLaidOut] = useState(!materialize);
  if (Platform.OS === "ios") {
    return (
      <StyledGlassView
        effect={{
          animate: true,
          animationDuration: GLASS_SECONDS,
          style: shown && laidOut ? "regular" : "none",
        }}
        isInteractive={isInteractive}
        tintColorClassName={tintColorClassName}
        className={className}
        style={style}
        onLayout={laidOut ? undefined : () => setLaidOut(true)}
      >
        {children}
      </StyledGlassView>
    );
  }
  return (
    <View
      className={cn(className, androidClassName ?? "bg-fill")}
      style={style}
    >
      {children}
    </View>
  );
}
