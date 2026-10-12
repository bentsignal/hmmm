import type { ImageSourcePropType } from "react-native";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";

import blueDark from "../../../assets/icons/previews/vera-blue-dark.png";
import blueLight from "../../../assets/icons/previews/vera-blue-light.png";
import greenDark from "../../../assets/icons/previews/vera-dark.png";
import devDark from "../../../assets/icons/previews/vera-dev-dark.png";
import devLight from "../../../assets/icons/previews/vera-dev-light.png";
import graphiteDark from "../../../assets/icons/previews/vera-graphite-dark.png";
import graphiteLight from "../../../assets/icons/previews/vera-graphite-light.png";
import indigoDark from "../../../assets/icons/previews/vera-indigo-dark.png";
import indigoLight from "../../../assets/icons/previews/vera-indigo-light.png";
import greenLight from "../../../assets/icons/previews/vera-light.png";
import orangeDark from "../../../assets/icons/previews/vera-orange-dark.png";
import orangeLight from "../../../assets/icons/previews/vera-orange-light.png";
import pinkDark from "../../../assets/icons/previews/vera-pink-dark.png";
import pinkLight from "../../../assets/icons/previews/vera-pink-light.png";
import purpleDark from "../../../assets/icons/previews/vera-purple-dark.png";
import purpleLight from "../../../assets/icons/previews/vera-purple-light.png";
import tealDark from "../../../assets/icons/previews/vera-teal-dark.png";
import tealLight from "../../../assets/icons/previews/vera-teal-light.png";

/** The native side of `expo-alternate-app-icons`. */
interface AlternateIconsModule {
  readonly supportsAlternateIcons: boolean;
  getAppIconName: () => string | null;
  setAlternateAppIcon: (name: string | null) => Promise<string | null>;
}

// Optional, so builds made before the module was added keep running; they
// just don't offer icon choices. Android has one icon.
const native =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<AlternateIconsModule>("ExpoAlternateAppIcons")
    : null;

const dev = Constants.expoConfig?.scheme === "vera-dev";

export interface AppIcon {
  readonly id: string;
  readonly name: string;
  /** The iOS alternate icon's name; null for the primary icon. */
  readonly native: string | null;
  /** Pre-masked 180px renders by `assets/icons/build-icons.py`. */
  readonly preview: {
    readonly dark: ImageSourcePropType;
    readonly light: ImageSourcePropType;
  };
}

/**
 * Home screen icons, the primary first: green for Vera, amber for Vera Dev.
 * They're separate from the color themes, so any icon goes with any theme.
 * The alternates are listed in app.config.ts.
 */
export const APP_ICONS = [
  ...(dev
    ? [
        {
          id: "dev",
          name: "Vera Dev",
          native: null,
          preview: { dark: devDark, light: devLight },
        },
      ]
    : []),
  {
    id: "green",
    name: "Green",
    native: dev ? "vera" : null,
    preview: { dark: greenDark, light: greenLight },
  },
  {
    id: "blue",
    name: "Blue",
    native: "vera-blue",
    preview: { dark: blueDark, light: blueLight },
  },
  {
    id: "teal",
    name: "Teal",
    native: "vera-teal",
    preview: { dark: tealDark, light: tealLight },
  },
  {
    id: "indigo",
    name: "Indigo",
    native: "vera-indigo",
    preview: { dark: indigoDark, light: indigoLight },
  },
  {
    id: "purple",
    name: "Purple",
    native: "vera-purple",
    preview: { dark: purpleDark, light: purpleLight },
  },
  {
    id: "pink",
    name: "Pink",
    native: "vera-pink",
    preview: { dark: pinkDark, light: pinkLight },
  },
  {
    id: "orange",
    name: "Orange",
    native: "vera-orange",
    preview: { dark: orangeDark, light: orangeLight },
  },
  {
    id: "graphite",
    name: "Graphite",
    native: "vera-graphite",
    preview: { dark: graphiteDark, light: graphiteLight },
  },
] satisfies readonly AppIcon[];

/**
 * The home screen icon (iOS only). `available` is false where the platform
 * or build can't switch icons. iOS keeps the choice itself, so it isn't a
 * saved preference.
 */
export function useAppIcon() {
  const [current, setCurrent] = useState(
    () => native?.getAppIconName() ?? null,
  );
  return {
    available: native?.supportsAlternateIcons === true,
    current,
    setIcon: (icon: AppIcon) => {
      if (native === null || icon.native === current) return;
      const previous = current;
      setCurrent(icon.native);
      native.setAlternateAppIcon(icon.native).catch(() => {
        setCurrent(previous);
        Alert.alert("Couldn't Change App Icon", "Try again in a moment.");
      });
    },
  };
}
