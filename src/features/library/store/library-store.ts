import { create } from "zustand";
import { Doc } from "@/convex/_generated/dataModel";
import { LibraryMode } from "../types/library-types";

interface LibraryStore {
  libraryOpen: boolean;
  setLibraryOpen: (open: boolean) => void;
  libraryDeleteModalOpen: boolean;
  setLibraryDeleteModalOpen: (open: boolean) => void;
  libraryRenameModalOpen: boolean;
  setLibraryRenameModalOpen: (open: boolean) => void;
  selectedFile: Doc<"files">["_id"] | null;
  setSelectedFile: (file: Doc<"files">["_id"] | null) => void;
  libraryMode: LibraryMode;
  setLibraryMode: (mode: LibraryMode) => void;
  selectedFiles: Doc<"files">["_id"][];
  setSelectedFiles: (files: Doc<"files">["_id"][]) => void;
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
  libraryMode: "default",
  setLibraryMode: (mode) => set({ libraryMode: mode }),
  selectedFiles: [],
  setSelectedFiles: (files) => set({ selectedFiles: files }),
}));
