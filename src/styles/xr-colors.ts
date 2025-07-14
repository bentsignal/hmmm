import { oklchStringToHex } from "@/lib/color-utils";

const COLORS = {
  background: "oklch(0.2 0 0)",
  foreground: "oklch(0.95 0 0)",
  card: "oklch(0.25 0 0)",
  cardForeground: "oklch(0.984 0 0)",
  popover: "oklch(0.25 0 0)",
  popoverForeground: "oklch(0.984 0 0)",
  primary: "oklch(0.95 0 0)",
  primaryForeground: "oklch(0.2 0 0)",
  borderInput: "oklch(0.5 0 0)",
};

export const XR_COLORS = Object.fromEntries(
  Object.entries(COLORS).map(([key, value]) => [key, oklchStringToHex(value)]),
);
