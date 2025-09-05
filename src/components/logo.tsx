import { cn } from "@/lib/utils";
import "@/styles/logo-anim.css";

export default function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.webp"
      alt="Logo"
      className={cn("size-[100px] mask-r-from-5% invert", className)}
    />
  );
}
