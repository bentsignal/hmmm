import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractTextFromChildren } from "../util/message-util";

interface CopyButtonProps {
  text?: string;
  code?: React.ReactNode;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

export function CopyButton({
  text,
  code,
  size = "sm",
  variant = "ghost",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      let textToCopy = text || "";
      if (code) {
        textToCopy = extractTextFromChildren(code);
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      size={size}
      variant={variant}
      className={`h-8 w-8 p-0 ${className}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
