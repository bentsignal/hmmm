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
}

const useComposerStore = create<ComposerStore>((set) => ({
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  currentModel: defaultModel,
  setCurrentModel: (model) => set({ currentModel: model }),
  useSearch: false,
  setUseSearch: (useSearch) => set({ useSearch }),
}));

export default useComposerStore;
