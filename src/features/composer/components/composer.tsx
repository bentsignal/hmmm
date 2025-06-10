"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useComposer from "../hooks/use-composer";

export default function Composer() {
  const { message, setMessage, handleKeyPress, disabled, handleSendMessage } =
    useComposer();

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div
        className={cn(
          `bg-background/95 supports-[backdrop-filter]:bg-background/60 max-w-4xl 
          rounded-2xl border shadow-lg backdrop-blur`,
        )}
      >
        <div className="flex items-end gap-3 p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={disabled}
            rows={1}
            className={cn(
              `file:text-foreground placeholder:text-muted-foreground selection:bg-primary 
              selection:text-primary-foreground focus-visible:ring-ring/0 
              aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex 
              h-auto max-h-32 min-h-[36px] w-full min-w-0 resize-none 
              overflow-y-auto px-3 py-2 text-base transition-[color,box-shadow] outline-none 
              focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed 
              disabled:opacity-50 md:text-sm`,
            )}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={disabled || !message.trim()}
            size="icon"
            className="shrink-0"
            variant="ghost"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
