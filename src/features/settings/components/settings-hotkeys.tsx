"use client";

const hotkeys = [
  {
    name: "New Chat",
    shortcut: "⌘ + /",
  },
  {
    name: "Search",
    shortcut: "⌘ + ⇧ + ?",
  },
  {
    name: "Focus input",
    shortcut: "⌘ + .",
  },
];

const Hotkey = ({ name, shortcut }: { name: string; shortcut: string }) => {
  return (
    <div className="flex flex-row gap-2">
      <span className="text-sm text-muted-foreground font-bold min-w-24">
        {name}
      </span>
      <span className="text-sm text-muted-foreground font-mono">
        {shortcut}
      </span>
    </div>
  );
};

export default function SettingsHotkeys() {
  return (
    <div className="flex flex-col gap-2">
      {hotkeys.map((hotkey) => (
        <Hotkey
          key={hotkey.name}
          name={hotkey.name}
          shortcut={hotkey.shortcut}
        />
      ))}
    </div>
  );
}
