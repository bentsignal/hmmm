import { useRef, useState } from "react";
import { useFileMutation } from "../hooks/use-file-mutation";
import { useLibraryStore } from "../store/library-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export const LibraryRenameModal = () => {
  const libraryRenameModalOpen = useLibraryStore(
    (state) => state.libraryRenameModalOpen,
  );
  const setLibraryRenameModalOpen = useLibraryStore(
    (state) => state.setLibraryRenameModalOpen,
  );

  const selectedFile = useLibraryStore((state) => state.selectedFile);

  const [newFileName, setNewFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { renameFile } = useFileMutation();

  return (
    <AlertDialog
      open={libraryRenameModalOpen}
      onOpenChange={setLibraryRenameModalOpen}
    >
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Rename File</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="flex flex-col gap-2">
          <span className="text-muted-foreground">
            Enter a new name for the file.
          </span>
          <Input
            ref={inputRef}
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter a new name..."
          />
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!selectedFile) return;
              renameFile(selectedFile, newFileName);
              setLibraryRenameModalOpen(false);
              setNewFileName("");
            }}
          >
            Rename
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
