const actions = ["use", "with", "using", "used"];
import { publicModels } from "@/features/models/types/models";

export const speechCommands = actions.flatMap((action) => {
  return publicModels.flatMap((model) => {
    return model.prononciations.flatMap((prononciation) => {
      if (action === "use") {
        return [
          {
            phrase: `${action} ${prononciation} to`,
            model: model,
          },
          {
            phrase: `${action} ${prononciation}`,
            model: model,
          },
        ];
      }
      return [
        {
          phrase: `${action} ${prononciation}`,
          model: model,
        },
      ];
    });
  });
});
