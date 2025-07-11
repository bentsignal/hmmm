import { defaultModel } from "@/features/models";
import { models } from "@/features/models/models";
import { PromptCategory, PromptDifficulty } from "@/features/prompts/types";

// determine the model based on user plan, prompt difficulty, and prompt category
export const getResponseModel = (
  promptCategory: PromptCategory,
  promptDifficulty: PromptDifficulty,
  tier: 0 | 1 | 2,
) => {
  switch (promptCategory) {
    case "general":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > 0 ? models["google/gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 0 ? models["google/gemini-2.5-flash"] : defaultModel;
        default:
          return defaultModel;
      }
    case "writing":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > 0 ? models["google/gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["google/gemini-2.5-pro"]
            : tier > 0
              ? models["google/gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "ui-code-gen":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > 0 ? models["google/gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["google/gemini-2.5-pro"]
            : tier > 0
              ? models["google/gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "stem":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return tier > 0 ? models["google/gemini-2.5-flash"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["google/gemini-2.5-pro"]
            : tier > 0
              ? models["google/gemini-2.5-flash"]
              : defaultModel;
        default:
          return defaultModel;
      }
    case "search":
      switch (promptDifficulty) {
        case "easy":
          return tier > 0 ? models["perplexity/sonar"] : defaultModel;
        case "medium":
          return tier > 0 ? models["perplexity/sonar"] : defaultModel;
        case "hard":
          return tier > 1
            ? models["perplexity/sonar-reasoning-pro"]
            : tier > 0
              ? models["perplexity/sonar"]
              : defaultModel;
        default:
          return defaultModel;
      }
    default:
      return defaultModel;
  }
};
