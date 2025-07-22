import { cn } from "@/lib/utils";

export default function Abyss({
  top = true,
  bottom = true,
  height = 100,
  bgColor = "background",
  blur = "lg",
  maskStart = 30,
  maskEnd = 100,
}: {
  /** whether to show the top gradient */
  top?: boolean;
  /** whether to show the bottom gradient */
  bottom?: boolean;
  /** height in px */
  height?: number | string;
  /** color that the gradient will fade to */
  bgColor?: string;
  /** blur amount */
  blur?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** mask amount */
  maskStart?: number;
  /** mask amount */
  maskEnd?: number;
}) {
  const base = `w-full left-0 absolute z-50 pointer-events-none`;

  const blurValues = {
    sm: "4px",
    md: "8px",
    lg: "16px",
    xl: "24px",
    "2xl": "40px",
  };

  const getCSSColor = (color: string) => `hsl(var(--${color}) / 0.8)`;

  return (
    <>
      {top && (
        <div
          className={cn(base, "top-0")}
          style={{
            height: `${height}px`,
            background: `linear-gradient(to top, transparent, ${getCSSColor(bgColor)})`,
            backdropFilter: `blur(${blurValues[blur]})`,
            maskImage: `linear-gradient(to bottom, black ${maskStart}%, transparent ${maskEnd}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black ${maskStart}%, transparent ${maskEnd}%)`,
          }}
        />
      )}
      {bottom && (
        <div
          className={cn(base, "bottom-0")}
          style={{
            height: `${height}px`,
            background: `linear-gradient(to bottom, transparent, ${getCSSColor(bgColor)})`,
            backdropFilter: `blur(${blurValues[blur]})`,
            maskImage: `linear-gradient(to top, black ${maskStart}%, transparent ${maskEnd}%)`,
            WebkitMaskImage: `linear-gradient(to top, black ${maskStart}%, transparent ${maskEnd}%)`,
          }}
        />
      )}
    </>
  );
}
