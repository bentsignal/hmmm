import { Shortcut } from "./types";

export const shortcuts = {
  "new-chat": {
    name: "New Chat",
    hotkey: {
      key: "/",
      ctrlCmd: true,
    },
  },
  search: {
    name: "Search",
    hotkey: {
      key: "?",
      ctrlCmd: true,
      shift: true,
    },
  },
  "focus-input": {
    name: "Focus Input",
    hotkey: {
      key: ".",
      ctrlCmd: true,
    },
  },
} as const satisfies Record<string, Shortcut>;
