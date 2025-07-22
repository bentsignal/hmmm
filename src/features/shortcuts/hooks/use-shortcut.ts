import { useEffect } from "react";
import { Hotkey } from "../types";

export default function useShortcut({
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
          // shift key active if required
          ((e.shiftKey && hotkey.shift) || (!hotkey.shift && !e.shiftKey)) &&
          // ctrl/cmd key active if required
          ((e.ctrlKey && hotkey.ctrlCmd) ||
            (e.metaKey && hotkey.ctrlCmd) ||
            (!hotkey.ctrlCmd && !e.ctrlKey && !e.metaKey)) &&
          // alt key active if required
          ((e.altKey && hotkey.alt) || (!hotkey.alt && !e.altKey))
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
