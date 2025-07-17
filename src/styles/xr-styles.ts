import { oklchStringToHex } from "@/lib/color-utils";

const base = 16;

export const rem = (px: number) => base * px;

const COLORS = {
  background: "oklch(0.2 0 0)",
  foreground: "oklch(0.95 0 0)",
  card: "oklch(0.25 0 0)",
  cardForeground: "oklch(0.95 0 0)",
  popover: "oklch(0.25 0 0)",
  popoverForeground: "oklch(0.95 0 0)",
  primary: "oklch(0.95 0 0)",
  primaryForeground: "oklch(0.2 0 0)",
  borderInput: "oklch(0.5 0 0)",
  accent: "oklch(0.3 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
};

export const XR_COLORS = Object.fromEntries(
  Object.entries(COLORS).map(([key, value]) => [key, oklchStringToHex(value)]),
);

export const XR_STYLES = {
  /** 16 * 0.25 = 4 */
  spacingSm: rem(0.25),
  /** 16 * 0.5 = 8 */
  spacingMd: rem(0.5),
  /** 16 * 1.25 = 20 */
  spacingLg: rem(1.25),
  /** 16 * 1.5 = 24 */
  spacingXl: rem(1.5),
  /** 16 * 2 = 32 */
  spacing2xl: rem(2),
  /** 16 * 2.5 = 40 */
  spacing3xl: rem(2.5),

  /** 16 * 0.5 = 8 */
  sizeSm: rem(0.5),
  /** 16 * 1 = 16 */
  sizeMd: rem(1),
  /** 16 * 1.25 = 20 */
  sizeLg: rem(1.25),
  /** 16 * 1.5 = 24 */
  sizeXl: rem(1.5),
  /** 16 * 2 = 32 */
  size2xl: rem(2),
  /** 16 * 2.5 = 40 */
  size3xl: rem(2.5),

  /** 16 * 0.75 = 12 */
  textXs: rem(0.75),
  /** 16 * 0.875 = 14 */
  textSm: rem(0.875),
  /** 16 * 1 = 16 */
  textMd: rem(1),
  /** 16 * 1.125 = 18 */
  textLg: rem(1.125),
  /** 16 * 1.25 = 20 */
  textXl: rem(1.25),
  /** 16 * 1.5 = 24 */
  text2xl: rem(1.5),

  /** 16 * 0.25 = 4 */
  radiusSm: rem(0.25),
  /** 16 * 0.5 = 8 */
  radiusMd: rem(0.5),
  /** 16 * 1.25 = 20 */
  radiusLg: rem(1.25),

  /** 16 * 16 = 256 */
  containerSm: rem(16),
  /** 16 * 24 = 384 */
  containerMd: rem(24),
  /** 16 * 32 = 512 */
  containerLg: rem(32),
};
