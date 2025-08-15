import { Plus, Trash2 } from "lucide-react";
import { useLibraryStore } from "../store/library-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useComposerStore } from "@/features/composer/store/composer-store";

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
      <AttachButton disabled={disabled} />
      <DeleteButton disabled={disabled} />
    </div>
  );
};

const AttachButton = ({ disabled }: { disabled: boolean }) => {
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);
  const setLibraryMode = useLibraryStore((state) => state.setLibraryMode);
  const setLibraryOpen = useLibraryStore((state) => state.setLibraryOpen);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            const selectedFiles = useLibraryStore.getState().selectedFiles;
            const { addAttachments } = useComposerStore.getState();
            addAttachments(selectedFiles);
            setSelectedFiles([]);
            setLibraryMode("default");
            setLibraryOpen(false);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Attach files to current thread</TooltipContent>
    </Tooltip>
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
