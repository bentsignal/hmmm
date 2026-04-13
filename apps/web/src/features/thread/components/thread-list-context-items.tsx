import { Pencil, Pin, PinOff, Trash } from "lucide-react";

import { useThreadMutation, useThreadStore } from "@acme/features/thread";
import * as ContextMenu from "@acme/ui/context-menu";

export function ThreadListContextItems() {
  const { togglePinned } = useThreadMutation();
  const triggerRenameModal = useThreadStore(
    (state) => state.triggerRenameModal,
  );
  const triggerDeleteModal = useThreadStore(
    (state) => state.triggerDeleteModal,
  );
  const hoveredThread = useThreadStore((state) => state.hoveredThread);
  return (
    <ContextMenu.ContextMenuContent>
      <ContextMenu.ContextMenuItem
        onClick={() => {
          if (hoveredThread) {
            togglePinned({ threadId: hoveredThread.id });
          }
        }}
      >
        {hoveredThread?.pinned ? (
          <PinOff className="h-4 w-4" />
        ) : (
          <Pin className="h-4 w-4" />
        )}
        {hoveredThread?.pinned ? "Unpin" : "Pin"}
      </ContextMenu.ContextMenuItem>
      <ContextMenu.ContextMenuItem onClick={triggerRenameModal}>
        <Pencil className="h-4 w-4" />
        Rename
      </ContextMenu.ContextMenuItem>
      <ContextMenu.ContextMenuItem onClick={triggerDeleteModal}>
        <Trash className="text-destructive h-4 w-4" />
        Delete
      </ContextMenu.ContextMenuItem>
    </ContextMenu.ContextMenuContent>
  );
}
