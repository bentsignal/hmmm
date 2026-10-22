import type { SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { withUniwind } from "uniwind";

import { SymbolIcon } from "~/components/symbol-icon";
import { cn } from "~/lib/cn";

const StyledImage = withUniwind(Image);

// iMessage's monogram: white initials on a soft gray gradient.
const MONOGRAM_GRADIENT = "linear-gradient(180deg, #a6abb8, #858994)";

const SIZES = {
  xs: { box: "size-[18px]", text: "text-[8px]", glyph: 9 },
  sm: { box: "size-7", text: "text-caption", glyph: 13 },
  row: { box: "size-9", text: "text-footnote", glyph: 16 },
  list: { box: "size-[46px]", text: "text-[19px]", glyph: 20 },
  md: { box: "size-12", text: "text-headline", glyph: 21 },
  header: { box: "size-[52px]", text: "text-[21px]", glyph: 23 },
  lg: { box: "size-20", text: "text-title", glyph: 34 },
  xl: { box: "size-[104px]", text: "text-[42px]", glyph: 44 },
};

/** A symbol standing in for initials, such as `#` for a channel. */
export type AvatarGlyph = SymbolViewProps["name"];

function initials(name: string) {
  // Words only, so a group titled "Maya, Leo & Priya" reads "ML".
  return name
    .split(/[\s,&]+/)
    .filter((part) => part !== "")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({
  name,
  size = "md",
  uri,
  glyph,
}: {
  name: string;
  size?: keyof typeof SIZES;
  /**
   * Profile photo. It fades in from nothing once loaded, never over the
   * initials (gray first, then a face, read as two pictures); they show
   * only if it can't load.
   */
  uri?: string | null;
  /** Shown instead of initials when there is no photo. */
  glyph?: AvatarGlyph;
}) {
  const { box, text, glyph: glyphSize } = SIZES[size];
  // The photo that couldn't load, if one didn't.
  const [failed, setFailed] = useState<string>();
  const photo = uri != null && uri !== "" && uri !== failed ? uri : undefined;
  return (
    <View accessibilityLabel={name} className={cn("rounded-full", box)}>
      {photo === undefined ? (
        <Monogram name={name} text={text} glyph={glyph} glyphSize={glyphSize} />
      ) : (
        <StyledImage
          source={{ uri: photo }}
          contentFit="cover"
          // Fades in rather than popping in, when it isn't already in
          // memory (see `usePhotosReady`).
          transition={180}
          onError={() => setFailed(photo)}
          className="absolute inset-0 rounded-full"
        />
      )}
    </View>
  );
}

/** Initials (or `glyph`) on iMessage's gray, for someone without a photo. */
function Monogram({
  name,
  text,
  glyph,
  glyphSize,
}: {
  name: string;
  text: string;
  glyph: AvatarGlyph | undefined;
  glyphSize: number;
}) {
  return (
    <View
      className="absolute inset-0 items-center justify-center rounded-full"
      style={{ experimental_backgroundImage: MONOGRAM_GRADIENT }}
    >
      {glyph === undefined ? (
        <Text className={cn("font-semibold text-white", text)}>
          {initials(name)}
        </Text>
      ) : (
        <SymbolIcon
          name={glyph}
          size={glyphSize}
          weight="semibold"
          tintColor="#ffffff"
        />
      )}
    </View>
  );
}
