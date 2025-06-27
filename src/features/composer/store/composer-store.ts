import { create } from "zustand";
// import { Model } from "@/features/models/types/model-types";
// import { defaultModel } from "@/features/models";

interface ComposerStore {
  // currentModel: Model;
  // setCurrentModel: (model: Model) => void;
  // useSearch: boolean;
  // setUseSearch: (useSearch: boolean) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  // speech
  storeIsListening: boolean;
  setStoreIsListening: (isListening: boolean) => void;
  storeIsRecording: boolean;
  setStoreIsRecording: (isRecording: boolean) => void;
  storeIsTranscribing: boolean;
  setStoreIsTranscribing: (isTranscribing: boolean) => void;
}

const useComposerStore = create<ComposerStore>((set) => ({
  // currentModel: defaultModel,
  // setCurrentModel: (model) => set({ currentModel: model }),
  // useSearch: false,
  // setUseSearch: (useSearch) => set({ useSearch }),
  // speech
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
