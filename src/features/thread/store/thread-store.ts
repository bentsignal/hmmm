import { create } from "zustand";

interface ThreadStore {
  // thread being selected in the thread list (currently just for deletion)
  selectedThread: string | null;
  setSelectedThread: (thread: string | null) => void;
  // thread currently open
  activeThread: string | null;
  setActiveThread: (thread: string | null) => void;
  // modal open for deleting a thread
  deleteModalOpen: boolean;
  setDeleteModalOpen: (open: boolean) => void;
}

const useThreadStore = create<ThreadStore>((set) => ({
  selectedThread: null,
  setSelectedThread: (thread) => set({ selectedThread: thread }),
  activeThread: null,
  setActiveThread: (thread) => set({ activeThread: thread }),
  deleteModalOpen: false,
  setDeleteModalOpen: (open) => set({ deleteModalOpen: open }),
}));

export default useThreadStore;
