import { useEffect, useRef, useState } from "react";
import useThreadMutation from "../hooks/use-thread-mutation";
import useThreadStore from "../store";
import * as Alert from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export default function ThreadRenameModal() {
  const renameModalOpen = useThreadStore((state) => state.renameModalOpen);
  const hoveredThread = useThreadStore((state) => state.hoveredThread);
  const setRenameModalOpen = useThreadStore(
    (state) => state.setRenameModalOpen,
  );

  const { renameThread } = useThreadMutation();

  const [newThreadName, setNewThreadName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewThreadName(hoveredThread?.title ?? "");
  }, [hoveredThread?.title]);

  return (
    <Alert.AlertDialog
      open={renameModalOpen}
      onOpenChange={(open) => {
        if (!open) {
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
