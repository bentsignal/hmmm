import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useFileMutations, useLibraryStore } from "@acme/features/library";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@acme/ui/alert-dialog";
import { Input } from "@acme/ui/input";

export function LibraryRenameModal() {
  const libraryRenameModalOpen = useLibraryStore(
    (state) => state.libraryRenameModalOpen,
  );
  const setLibraryRenameModalOpen = useLibraryStore(
    (state) => state.setLibraryRenameModalOpen,
  );

  const selectedFile = useLibraryStore((state) => state.selectedFile);

  const [newFileName, setNewFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const mutations = useFileMutations();
  const { mutate: renameFile } = useMutation({
    ...mutations.renameFile,
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename file");
    },
  });

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
              renameFile({ id: selectedFile.id, name: newFileName });
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
}
