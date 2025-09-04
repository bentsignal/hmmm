export const themes = [
  "sunrise",
  "afternoon",
  "nebula",
  "outer-space",
] as const;

export type Theme = (typeof themes)[number];

export const defaultTheme = "nebula";

export const getThemeClass = (theme: Theme) => `theme-${theme}`;
