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
  const gradient = `from-transparent to-${bgColor}/80`;
  const blurClass = `backdrop-blur-${blur}`;
  return (
    <>
      {top && (
        <div
          className={cn(
            base,
            gradient,
            blurClass,
            "top-0",
            "bg-linear-to-t",
            `mask-b-from-${maskStart}% mask-b-to-${maskEnd}%`,
          )}
          style={{
            height: `${height}px`,
          }}
        />
      )}
      {bottom && (
        <div
          className={cn(
            base,
            gradient,
            blurClass,
            "bottom-0",
            "bg-linear-to-b",
            `mask-t-from-${maskStart}% mask-t-to-${maskEnd}%`,
          )}
          style={{
            height: `${height}px`,
          }}
        />
      )}
    </>
  );
}
