import {
  defaultModel,
  languageModels as models,
  type LanguageModel,
} from "@/convex/agents/models";
import {
  PromptCategory,
  PromptDifficulty,
} from "@/convex/agents/prompts/types";
import { PlanTier } from "@/convex/sub/sub_types";

// determine the model based on user plan, prompt difficulty, and prompt category
export const getResponseModel = (
  promptCategory: PromptCategory,
  promptDifficulty: PromptDifficulty,
  tier: PlanTier,
): LanguageModel => {
  switch (promptCategory) {
    case "general":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > PlanTier.Light
            ? models["gemini-2.5-flash"]
            : defaultModel;
        case "hard":
          return tier > PlanTier.Light
            ? models["gemini-2.5-flash"]
            : defaultModel;
        default:
          return defaultModel;
      }
    case "writing":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > PlanTier.Light
            ? models["gemini-2.5-flash"]
            : defaultModel;
        case "hard":
          return tier > PlanTier.Premium
            ? models["gemini-2.5-pro"]
            : tier > PlanTier.Light
              ? models["gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "ui-code-gen":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > PlanTier.Light
            ? models["gemini-2.5-flash"]
            : defaultModel;
        case "hard":
          return tier > PlanTier.Premium
            ? models["gemini-2.5-pro"]
            : tier > PlanTier.Light
              ? models["gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "stem":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > PlanTier.Light
            ? models["gemini-2.5-flash"]
            : defaultModel;
        case "hard":
          return tier > PlanTier.Premium
            ? models["gemini-2.5-pro"]
            : tier > PlanTier.Light
              ? models["gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "search":
      switch (promptDifficulty) {
        case "easy":
          return tier > PlanTier.Free ? models["sonar"] : defaultModel;
        case "medium":
          return tier > PlanTier.Free ? models["sonar"] : defaultModel;
        case "hard":
          return tier > PlanTier.Premium
            ? models["sonar-reasoning-pro"]
            : tier > PlanTier.Free
              ? models["sonar"]
              : defaultModel;
        default:
          return defaultModel;
      }
    default:
      return defaultModel;
  }
};
