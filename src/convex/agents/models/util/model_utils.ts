import {
  defaultModel,
  languageModels as models,
  type LanguageModel,
} from "@/convex/agents/models";
import {
  PromptCategory,
  PromptDifficulty,
} from "@/convex/agents/prompts/types";

// determine the model based on user plan, prompt difficulty, and prompt category
export const getResponseModel = (
  promptCategory: PromptCategory,
  promptDifficulty: PromptDifficulty,
  tier: 0 | 1 | 2,
): LanguageModel => {
  switch (promptCategory) {
    case "general":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > 0 ? models["gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 0 ? models["gemini-2.5-flash"] : defaultModel;
        default:
          return defaultModel;
      }
    case "writing":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > 0 ? models["gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["gemini-2.5-pro"]
            : tier > 0
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
          return tier > 0 ? models["gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["gemini-2.5-pro"]
            : tier > 0
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
          return tier > 0 ? models["gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["gemini-2.5-pro"]
            : tier > 0
              ? models["gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "search":
      switch (promptDifficulty) {
        case "easy":
          return tier > 0 ? models["sonar"] : defaultModel;
        case "medium":
          return tier > 0 ? models["sonar"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["sonar-reasoning-pro"]
            : tier > 0
              ? models["sonar"]
              : defaultModel;
        default:
          return defaultModel;
      }
    default:
      return defaultModel;
  }
};
