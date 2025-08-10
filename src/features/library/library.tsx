import { useState } from "react";
import { Library as LibraryIcon } from "lucide-react";
import { shortcuts } from "../shortcuts";
import useShortcut from "../shortcuts/hooks/use-shortcut";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Library({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader className="sr-only">
          <DialogTitle>Library</DialogTitle>
          <DialogDescription>
            Your library of files and documents.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Files</h2>
            <p className="text-muted-foreground text-sm">
              Your files and documents.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
