import { create } from "zustand";

interface ComposerStore {
  prompt: string;
  setPrompt: (prompt: string) => void;
  storeIsListening: boolean;
  setStoreIsListening: (isListening: boolean) => void;
  storeIsRecording: boolean;
  setStoreIsRecording: (isRecording: boolean) => void;
  storeIsTranscribing: boolean;
  setStoreIsTranscribing: (isTranscribing: boolean) => void;
}

const useComposerStore = create<ComposerStore>((set) => ({
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  storeIsListening: false,
  setStoreIsListening: (storeIsListening) => set({ storeIsListening }),
  storeIsRecording: false,
  setStoreIsRecording: (storeIsRecording) => set({ storeIsRecording }),
  storeIsTranscribing: false,
  setStoreIsTranscribing: (storeIsTranscribing) => set({ storeIsTranscribing }),
}));

export default useComposerStore;
