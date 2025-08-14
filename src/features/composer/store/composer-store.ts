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
}

export const useComposerStore = create<ComposerStore>((set) => ({
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
}));

export default useComposerStore;
