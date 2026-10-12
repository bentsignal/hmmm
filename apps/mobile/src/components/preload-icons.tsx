import type { ImageSourcePropType } from "react-native";

/**
 * iOS header buttons use SF Symbols, which need no preloading. See
 * `preload-icons.android.tsx`.
 */
export function PreloadIcons(_props: {
  /** Each icon, by a name to key it with. */
  icons: Readonly<Record<string, ImageSourcePropType>>;
}) {
  return null;
}
