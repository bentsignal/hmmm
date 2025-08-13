import { create } from "zustand";
import { Doc } from "@/convex/_generated/dataModel";

interface LibraryStore {
  libraryOpen: boolean;
  setLibraryOpen: (open: boolean) => void;
  libraryDeleteModalOpen: boolean;
  setLibraryDeleteModalOpen: (open: boolean) => void;
  libraryRenameModalOpen: boolean;
  setLibraryRenameModalOpen: (open: boolean) => void;
  selectedFile: Doc<"files">["_id"] | null;
  setSelectedFile: (file: Doc<"files">["_id"] | null) => void;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  libraryOpen: false,
  setLibraryOpen: (open) => set({ libraryOpen: open }),
  libraryDeleteModalOpen: false,
  setLibraryDeleteModalOpen: (open) => set({ libraryDeleteModalOpen: open }),
  libraryRenameModalOpen: false,
  setLibraryRenameModalOpen: (open) => set({ libraryRenameModalOpen: open }),
  selectedFile: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
}));
