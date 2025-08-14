import { Plus, Trash2 } from "lucide-react";
import { useLibraryStore } from "../store/library-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const LibraryBulkToolbar = () => {
  const inSelectMode = useLibraryStore(
    (state) => state.libraryMode === "select",
  );
  const disabled = useLibraryStore((state) => state.selectedFiles.length === 0);

  if (!inSelectMode) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-background my-4 flex items-center justify-center rounded-xl border p-2",
        disabled && "opacity-50",
      )}
    >
      {/* <AttachButton disabled={disabled} /> */}
      <DeleteButton disabled={disabled} />
    </div>
  );
};

const AttachButton = ({ disabled }: { disabled: boolean }) => {
  return (
    <Button
      variant="ghost"
      disabled={disabled}
      onClick={() => {
        console.log("attach");
      }}
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
};

const DeleteButton = ({ disabled }: { disabled: boolean }) => {
  const setLibraryDeleteModalOpen = useLibraryStore(
    (state) => state.setLibraryDeleteModalOpen,
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={async () => {
            setLibraryDeleteModalOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Delete selected files</TooltipContent>
    </Tooltip>
  );
};
