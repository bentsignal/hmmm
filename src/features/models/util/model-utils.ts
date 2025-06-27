import { generalModel, searchModel, complexModel } from "@/features/models";
import { PromptCategory } from "@/features/models/types";

export const getModelByPromptCategory = (promptCategory: PromptCategory) => {
  switch (promptCategory) {
    case "search":
      return searchModel;
    case "complex":
      return complexModel;
    default:
      return generalModel;
  }
};
