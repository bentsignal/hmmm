import { Hotkey } from "../types";

export const getShortcutString = (hotkey: Hotkey) => {
  const keys = [];
  if (hotkey.ctrlCmd) keys.push("⌘");
  if (hotkey.shift) keys.push("⇧");
  if (hotkey.alt) keys.push("⌥");
  keys.push(hotkey.key);
  return keys.join(" + ");
};
