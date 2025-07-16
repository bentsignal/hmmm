import { create } from "zustand";

interface ThreadStore {
  // thread being hovered over in thread list
  hoveredThread: string | null;
  setHoveredThread: (thread: string | null) => void;
  // thread currently open
  activeThread: string | null;
  setActiveThread: (thread: string | null) => void;
  // modal open for deleting a thread
  deleteModalOpen: boolean;
  setDeleteModalOpen: (open: boolean) => void;
  triggerDeleteModal: () => void;
}

const useThreadStore = create<ThreadStore>((set) => ({
  hoveredThread: null,
  setHoveredThread: (thread) => set({ hoveredThread: thread }),
  activeThread: null,
  setActiveThread: (thread) => set({ activeThread: thread }),
  deleteModalOpen: false,
  setDeleteModalOpen: (open) => set({ deleteModalOpen: open }),
  triggerDeleteModal: () => set({ deleteModalOpen: true }),
}));

export default useThreadStore;
