import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useThreadMutations, useThreadStore } from "@acme/features/thread";
import * as Alert from "@acme/ui/alert-dialog";
import { Input } from "@acme/ui/input";

export function ThreadRenameModal() {
  const renameModalOpen = useThreadStore((state) => state.renameModalOpen);
  const hoveredThread = useThreadStore((state) => state.hoveredThread);
  const setRenameModalOpen = useThreadStore(
    (state) => state.setRenameModalOpen,
  );

  const threadMutations = useThreadMutations();
  const { mutate: renameThread } = useMutation({
    ...threadMutations.rename,
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename thread");
    },
  });

  const [newThreadName, setNewThreadName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Alert.AlertDialog
      open={renameModalOpen}
      onOpenChange={(open) => {
        if (open) {
          setNewThreadName(hoveredThread?.title ?? "");
        } else {
          setRenameModalOpen(false);
          setNewThreadName("");
        }
      }}
    >
      <Alert.AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Alert.AlertDialogHeader>
          <Alert.AlertDialogTitle>Rename Thread</Alert.AlertDialogTitle>
        </Alert.AlertDialogHeader>
        <Alert.AlertDialogDescription className="flex flex-col gap-2">
          <span className="text-muted-foreground">
            Enter a new name for the thread.
          </span>
          <Input
            ref={inputRef}
            value={newThreadName}
            onChange={(e) => setNewThreadName(e.target.value)}
            placeholder="Enter a new name..."
          />
        </Alert.AlertDialogDescription>
        <Alert.AlertDialogFooter>
          <Alert.AlertDialogCancel>Cancel</Alert.AlertDialogCancel>
          <Alert.AlertDialogAction
            onClick={() => {
              if (!hoveredThread) return;
              renameThread({
                threadId: hoveredThread.id,
                name: newThreadName,
              });
              setRenameModalOpen(false);
              setNewThreadName("");
            }}
          >
            Rename
          </Alert.AlertDialogAction>
        </Alert.AlertDialogFooter>
      </Alert.AlertDialogContent>
    </Alert.AlertDialog>
  );
}
