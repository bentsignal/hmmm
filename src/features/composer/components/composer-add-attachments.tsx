import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLibraryStore } from "@/features/library/store/library-store";

export const ComposerAddAttachments = () => {
  const setLibraryOpen = useLibraryStore((state) => state.setLibraryOpen);
  const setLibraryMode = useLibraryStore((state) => state.setLibraryMode);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setLibraryOpen(true);
            setLibraryMode("select");
          }}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add attachments</TooltipContent>
    </Tooltip>
  );
};
