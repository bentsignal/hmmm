import { useState } from "react";
import { Library as LibraryIcon } from "lucide-react";
import Library from "../library";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortcuts } from "@/features/shortcuts";
import useShortcut from "@/features/shortcuts/hooks/use-shortcut";

export const LibraryButton = () => {
  const [open, setOpen] = useState(false);

  useShortcut({
    hotkey: shortcuts.library.hotkey,
    callback: () => setOpen(true),
  });

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
            <LibraryIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Library</p>
        </TooltipContent>
      </Tooltip>
      <Library open={open} setOpen={setOpen} />
    </>
  );
};
