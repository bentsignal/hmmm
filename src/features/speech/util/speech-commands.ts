const actions = ["use", "with", "using", "used"];
import { Model } from "@/features/models/types/model-types";
import { publicModels } from "@/features/models/types/models";

export const getSpeechCommands = (
  voiceSetModel: (model: Model, prompt: string) => void,
) => {
  return actions.flatMap((action) => {
    return publicModels.flatMap((model) => {
      return model.prononciations.map((prononciation) => {
        return {
          command: `* ${action} ${prononciation}`,
          callback: (prompt: string) => voiceSetModel(model, prompt),
        };
      });
    });
  });
};
