import { Platform, Text } from "react-native";

/**
 * Apple's emoji sit a little left of the middle of the space a font gives
 * them, so one centered in a circle looks off to the left. This much of the
 * emoji's size nudges it back to the visual middle. Android's emoji are
 * centered already.
 */
const IOS_OPTICAL_SHIFT = 0.05;

/**
 * An emoji to center in something round (a reaction): its line is exactly
 * its size, so it centers vertically, and it's nudged to look centered
 * across too.
 */
export function Emoji({ emoji, size }: { emoji: string; size: number }) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        fontSize: size,
        lineHeight: Math.round(size * 1.2),
        textAlign: "center",
        transform:
          Platform.OS === "ios"
            ? [{ translateX: size * IOS_OPTICAL_SHIFT }]
            : undefined,
      }}
    >
      {emoji}
    </Text>
  );
}
