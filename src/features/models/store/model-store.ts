import { create } from "zustand";
import { Model } from "../types/model-types";
import { publicModels } from "../types/models";

interface ModelStore {
  currentModel: Model;
  setCurrentModel: (model: Model) => void;
}

const useModelStore = create<ModelStore>((set) => ({
  currentModel: publicModels[0],
  setCurrentModel: (model) => set({ currentModel: model }),
}));

export default useModelStore;
