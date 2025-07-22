import { shortcuts } from "../shortcuts";
import { getShortcutString } from "../util";

export default function Shortcuts() {
  return (
    <div className="flex flex-col gap-2">
      {Object.values(shortcuts).map((shortcut) => (
        <div key={shortcut.name} className="flex flex-row gap-2">
          <span className="font-bold min-w-24">{shortcut.name}</span>
          <span className="font-mono">
            {getShortcutString(shortcut.hotkey)}
          </span>
        </div>
      ))}
    </div>
  );
}
