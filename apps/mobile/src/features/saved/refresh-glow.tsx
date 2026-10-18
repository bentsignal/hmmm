import { useState } from "react";
import { useColorScheme, useWindowDimensions, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { neighborHues } from "./glow-colors";
import { useDeadline } from "./use-saved-fallback";

/** How far below its line the glow reaches. */
const HEIGHT = 140;
/** How long one pass of the shimmer takes, for each layer. */
const DRIFT_MS = [7000, 11000] as const;
const FADE_MS = 450;
/**
 * How long the glow shows without the live data arriving: offline, it
 * would otherwise shimmer for as long as the screen is open.
 */
const GIVE_UP_MS = 10_000;

/**
 * One period of a layer: soft light spreading down from the line, in
 * each of `colors` across the width. The lights at its ends reach past
 * them, so it also draws its neighbors' (clipped to its own width) and
 * periods side by side meet without a seam.
 */
function Lights({
  colors,
  width,
}: {
  colors: readonly string[];
  width: number;
}) {
  const span = width / colors.length;
  const places = Array.from(
    { length: colors.length + 2 },
    (_, index) => index - 1,
  );
  return (
    <View style={{ height: HEIGHT, overflow: "hidden", width }}>
      {places.map((place) => {
        const color = colors[(place + colors.length) % colors.length];
        return (
          <View
            key={place}
            style={{
              experimental_backgroundImage: `radial-gradient(closest-side, ${color} 0%, transparent 100%)`,
              height: HEIGHT * 2,
              left: span * place - span * 0.35,
              position: "absolute",
              top: -HEIGHT,
              width: span * 1.7,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * A layer drifting sideways forever: two periods side by side, moved by
 * one width, so it loops without a seam.
 */
function Drift({
  colors,
  direction,
  durationMs,
  still,
  width,
}: {
  colors: readonly string[];
  direction: 1 | -1;
  durationMs: number;
  still: boolean;
  width: number;
}) {
  return (
    <Animated.View
      style={{
        flexDirection: "row",
        height: HEIGHT,
        left: direction === 1 ? -width : 0,
        position: "absolute",
        top: 0,
        width: width * 2,
        ...(!still && {
          animationDuration: durationMs,
          animationIterationCount: "infinite",
          animationName: {
            from: { transform: [{ translateX: 0 }] },
            to: { transform: [{ translateX: direction * width }] },
          },
          animationTimingFunction: "linear",
        }),
      }}
    >
      <Lights colors={colors} width={width} />
      <Lights colors={colors} width={width} />
    </Animated.View>
  );
}

/**
 * The glow under a header while its screen shows what was saved on the
 * device: light in the theme's color and its neighbors, drifting slowly
 * along the header's edge and falling off over the top rows. It fades out
 * once the live data has replaced what was saved, or after a while
 * without it.
 */
export function RefreshGlow({
  active,
  top = 0,
}: {
  active: boolean;
  /** Where the header's edge is, from the top of the screen. */
  top?: number;
}) {
  const { width } = useWindowDimensions();
  const dark = useColorScheme() === "dark";
  const accent = useCSSVariable("--color-accent");
  const still = useReducedMotion();
  const [gaveUp, setGaveUp] = useState(false);
  useDeadline(GIVE_UP_MS, active, () => setGaveUp(true));
  if (typeof accent !== "string") return null;
  const [left, right] = neighborHues(accent);
  // Each color with an alpha, as #rrggbbaa.
  const alpha = dark ? "73" : "4d";
  const edge = dark ? "cc" : "99";
  const shown = active && !gaveUp;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        height: HEIGHT,
        left: 0,
        opacity: shown ? 1 : 0,
        overflow: "hidden",
        position: "absolute",
        right: 0,
        top,
        transitionDuration: FADE_MS,
        transitionProperty: "opacity",
        transitionTimingFunction: "ease-in-out",
      }}
    >
      <Drift
        colors={[`${accent}${alpha}`, `${left}${alpha}`, `${right}${alpha}`]}
        direction={-1}
        durationMs={DRIFT_MS[0]}
        still={still}
        width={width}
      />
      <Drift
        colors={[`${right}${alpha}`, `${accent}${alpha}`]}
        direction={1}
        durationMs={DRIFT_MS[1]}
        still={still}
        width={width}
      />
      {/* The edge itself, lit along its length. */}
      <View
        style={{
          experimental_backgroundImage: `linear-gradient(90deg, ${left}00 0%, ${accent}${edge} 30%, ${right}${edge} 70%, ${left}00 100%)`,
          height: 1.5,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
    </Animated.View>
  );
}
