import { Pencil, Pin, PinOff, Trash } from "lucide-react";
import useThreadMutation from "../hooks/use-thread-mutation";
import useThreadStore from "../store";
import * as ContextMenu from "@/components/ui/context-menu";

export default function ThreadListContextItems() {
  const { togglePinned } = useThreadMutation();
  const { triggerRenameModal, triggerDeleteModal } = useThreadStore();
  const hoveredThread = useThreadStore.getState().hoveredThread;
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
