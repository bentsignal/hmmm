import { create } from "zustand";
import { Thread } from "../types";

interface ThreadStore {
  // thread being hovered over in thread list
  hoveredThread: Thread | null;
  setHoveredThread: (thread: Thread | null) => void;
  // thread currently open
  activeThread: string | null;
  setActiveThread: (thread: string | null) => void;
  // modal open for deleting a thread
  deleteModalOpen: boolean;
  setDeleteModalOpen: (open: boolean) => void;
  triggerDeleteModal: () => void;
  // modal open for renaming a thread
  renameModalOpen: boolean;
  setRenameModalOpen: (open: boolean) => void;
  triggerRenameModal: () => void;
  // threads open in xr
  xrThreads: Thread[];
  addXrThread: (thread: Thread) => void;
  removeXrThread: (thread: Thread) => void;
  // main thread in xr
  mainThread: Thread | null;
  setMainThread: (thread: Thread | null) => void;
}

const useThreadStore = create<ThreadStore>((set, get) => ({
  hoveredThread: null,
  setHoveredThread: (thread) => set({ hoveredThread: thread }),
  activeThread: null,
  setActiveThread: (thread) => set({ activeThread: thread }),
  deleteModalOpen: false,
  setDeleteModalOpen: (open) => set({ deleteModalOpen: open }),
  triggerDeleteModal: () => set({ deleteModalOpen: true }),
  renameModalOpen: false,
  setRenameModalOpen: (open) => set({ renameModalOpen: open }),
  triggerRenameModal: () => set({ renameModalOpen: true }),
  xrThreads: [],
  addXrThread: (thread: Thread) => {
    const xrThreads = get().xrThreads;
    if (xrThreads.find((t) => t.id === thread.id)) return;
    set((state) => ({
      xrThreads: [...state.xrThreads, thread],
    }));
  },
  removeXrThread: (thread: Thread) => {
    set((state) => ({
      xrThreads: state.xrThreads.filter((t) => t.id !== thread.id),
    }));
  },
  mainThread: null,
  setMainThread: (thread) => set({ mainThread: thread }),
}));

export default useThreadStore;
