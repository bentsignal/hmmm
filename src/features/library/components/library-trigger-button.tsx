import { Library as LibraryIcon } from "lucide-react";
import { useLibraryStore } from "../store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortcuts } from "@/features/shortcuts";
import useShortcut from "@/features/shortcuts/hooks/use-shortcut";

export const LibraryButton = () => {
  const setLibraryOpen = useLibraryStore((state) => state.setLibraryOpen);

  useShortcut({
    hotkey: shortcuts.library.hotkey,
    callback: () => setLibraryOpen(true),
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLibraryOpen(true)}
        >
          <LibraryIcon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Library</p>
      </TooltipContent>
    </Tooltip>
  );
};
