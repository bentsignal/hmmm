import type { Theme } from "./contract";
import { FIXTURE_THEME } from "./fixtures";

/** The dark theme, as the app's CSS variables have it (global.css). */
export const FIXTURE_THEME_DARK = {
  ...FIXTURE_THEME,
  colors: {
    accent: "#0a84ff",
    background: "#000000",
    bubbleIncoming: "#26252a",
    bubbleOutgoing: "#0a84ff",
    destructive: "#ff453a",
    fill: "rgba(118, 118, 128, 0.24)",
    foreground: "#ffffff",
    highlight: "rgba(255, 214, 10, 0.2)",
    monogramBottom: "#5b5e66",
    monogramTop: "#7a7e89",
    muted: "rgba(235, 235, 245, 0.6)",
    onAccent: "#ffffff",
    separator: "rgba(84, 84, 88, 0.65)",
    subtle: "rgba(235, 235, 245, 0.3)",
    textIncoming: "#ffffff",
    textOutgoing: "#ffffff",
  },
} satisfies Theme;
