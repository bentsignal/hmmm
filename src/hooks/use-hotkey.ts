import { useEffect } from "react";

interface Hotkey {
  key: string;
  shift?: boolean;
  ctrlCmd?: boolean;
}

export default function useHotkey({
  hotkey,
  callback,
}: {
  hotkey: Hotkey;
  callback: () => void;
}) {
  useEffect(() => {
    const controller = new AbortController();

    window.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (
          e.key === hotkey.key &&
          ((e.shiftKey && hotkey.shift) || !hotkey.shift) &&
          ((e.ctrlKey && hotkey.ctrlCmd) ||
            (e.metaKey && hotkey.ctrlCmd) ||
            !hotkey.ctrlCmd)
        ) {
          e.preventDefault();
          e.stopPropagation();
          callback();
        }
      },
      { signal: controller.signal, capture: true },
    );

    return () => {
      controller.abort();
    };
  }, [hotkey, callback]);
}
