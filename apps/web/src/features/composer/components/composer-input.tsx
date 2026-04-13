import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";

import { useComposerInput } from "@acme/features/composer";
import { shortcuts } from "@acme/features/shortcuts";

import { useShortcut as useHotkey } from "~/features/shortcuts/hooks/use-shortcut";
import { useSendMessage } from "../hooks/use-send-message";

export function ComposerInput({
  showInstantLoad,
  handleError,
}: {
  showInstantLoad?: () => void;
  handleError?: () => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { value, setPrompt, disabled, placeholder } = useComposerInput();
  const { sendMessage } = useSendMessage();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // eslint-disable-next-line no-restricted-syntax -- Syncs with DOM: imperatively resizes textarea height based on content scroll height
  useEffect(() => {
    if (value === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    } else if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // send message when user hits enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage({ showInstantLoad, handleError });
    }
  };

  const focusInput = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  };

  // eslint-disable-next-line no-restricted-syntax -- Syncs with DOM: focuses the textarea input on initial mount
  useEffect(() => {
    focusInput();
  }, []);

  useHotkey({
    hotkey: shortcuts["focus-input"].hotkey,
    callback: focusInput,
  });

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setPrompt(e.target.value)}
      onKeyDown={handleKeyPress}
      placeholder={placeholder}
      disabled={isAuthenticated && disabled}
      rows={1}
      maxLength={20000}
      className={`file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:ring-ring/0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent flex h-auto max-h-32 min-h-[36px] w-full min-w-0 resize-none overflow-y-auto py-2 text-base transition-[color,box-shadow] outline-none select-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 md:text-sm`}
    />
  );
}
