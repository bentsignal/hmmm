import { Pencil, Trash } from "lucide-react";
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
  return (
    <ContextMenuContent>
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
