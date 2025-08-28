import { DownloadIcon, Pencil, Trash } from "lucide-react";
import { useFileInteraction } from "../hooks/use-file-interaction";
import { useLibraryStore } from "../store";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";

export const LibraryFileContextItems = () => {
  const setLibraryDeleteModalOpen = useLibraryStore(
    (state) => state.setLibraryDeleteModalOpen,
  );
  const setLibraryRenameModalOpen = useLibraryStore(
    (state) => state.setLibraryRenameModalOpen,
  );
  const { download } = useFileInteraction();
  return (
    <ContextMenuContent>
      <ContextMenuItem
        onClick={() => {
          const selectedFile = useLibraryStore.getState().selectedFile;
          if (!selectedFile) {
            return;
          }
          download([selectedFile.url]);
        }}
      >
        <DownloadIcon className="h-4 w-4" />
        Download
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setLibraryRenameModalOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setLibraryDeleteModalOpen(true);
        }}
      >
        <Trash className="h-4 w-4" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );
};
