import { create } from "zustand";
import { Model } from "@/features/models/types/model-types";
import { defaultModel } from "@/features/models/types/models";

interface ComposerStore {
  prompt: string;
  setPrompt: (prompt: string) => void;
  currentModel: Model;
  setCurrentModel: (model: Model) => void;
  useSearch: boolean;
  setUseSearch: (useSearch: boolean) => void;
  // speech
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
  currentModel: defaultModel,
  setCurrentModel: (model) => set({ currentModel: model }),
  useSearch: false,
  setUseSearch: (useSearch) => set({ useSearch }),
  // speech
  storeIsListening: false,
  setStoreIsListening: (storeIsListening) => set({ storeIsListening }),
  storeIsRecording: false,
  setStoreIsRecording: (storeIsRecording) => set({ storeIsRecording }),
  storeIsTranscribing: false,
  setStoreIsTranscribing: (storeIsTranscribing) => set({ storeIsTranscribing }),
}));

export default useComposerStore;
