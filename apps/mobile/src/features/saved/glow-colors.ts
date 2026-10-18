/** How far around the color wheel the glow's other two colors sit. */
const SHIFT = 40;

function channels(hex: string) {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (channel) => channel / 255,
  );
}

function toHsl(hex: string) {
  const [r = 0, g = 0, b = 0] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, lightness, saturation: 0 };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const sector =
    max === r
      ? ((g - b) / delta + 6) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return { hue: sector * 60, lightness, saturation };
}

function toHex({
  hue,
  lightness,
  saturation,
}: {
  hue: number;
  lightness: number;
  saturation: number;
}) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [r, g, b] =
    sector < 1
      ? [chroma, second, 0]
      : sector < 2
        ? [second, chroma, 0]
        : sector < 3
          ? [0, chroma, second]
          : sector < 4
            ? [0, second, chroma]
            : sector < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];
  const base = lightness - chroma / 2;
  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + base) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** The theme color's neighbors on the color wheel, either side, as #rrggbb. */
export function neighborHues(accent: string) {
  const color = toHsl(accent);
  return [
    toHex({ ...color, hue: color.hue - SHIFT }),
    toHex({ ...color, hue: color.hue + SHIFT }),
  ] as const;
}
