import { create } from "zustand";
import { LibraryFile } from "@/features/library/types/library-types";

interface ComposerStore {
  prompt: string;
  setPrompt: (prompt: string) => void;
  storeIsListening: boolean;
  setStoreIsListening: (isListening: boolean) => void;
  storeIsRecording: boolean;
  setStoreIsRecording: (isRecording: boolean) => void;
  storeIsTranscribing: boolean;
  setStoreIsTranscribing: (isTranscribing: boolean) => void;
  attachedFiles: LibraryFile[];
  setAttachedFiles: (files: LibraryFile[]) => void;
  addAttachment: (file: LibraryFile) => void;
  addAttachments: (files: LibraryFile[]) => void;
  removeAttachment: (id: LibraryFile["id"]) => void;
  clearAttachments: () => void;
}

export const useComposerStore = create<ComposerStore>((set, get) => ({
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  storeIsListening: false,
  setStoreIsListening: (storeIsListening) => set({ storeIsListening }),
  storeIsRecording: false,
  setStoreIsRecording: (storeIsRecording) => set({ storeIsRecording }),
  storeIsTranscribing: false,
  setStoreIsTranscribing: (storeIsTranscribing) => set({ storeIsTranscribing }),
  attachedFiles: [],
  setAttachedFiles: (files) => set({ attachedFiles: files }),
  addAttachment: (file) => {
    const { attachedFiles } = get();
    const dedupedFiles = attachedFiles.filter((f) => f.id !== file.id);
    set({ attachedFiles: [...dedupedFiles, file] });
  },
  addAttachments: (files) => {
    const { attachedFiles } = get();
    const dedupedFiles = files.filter(
      (file) => !attachedFiles.some((f) => f.id === file.id),
    );
    set({ attachedFiles: [...attachedFiles, ...dedupedFiles] });
  },
  removeAttachment: (id) => {
    const { attachedFiles } = get();
    set({ attachedFiles: attachedFiles.filter((f) => f.id !== id) });
  },
  clearAttachments: () => set({ attachedFiles: [] }),
}));

export default useComposerStore;
