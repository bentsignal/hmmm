import { Loader } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function CustomButton({
  loading,
  disabled,
  onClick,
  className,
  label,
  variant,
}: {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}) {
  return (
    <Button
      variant={variant ?? "default"}
      className={cn(className, "hover:cursor-pointer")}
      disabled={loading || disabled}
      onClick={onClick}
    >
      {loading ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        (label ?? "Save")
      )}
    </Button>
  );
}
