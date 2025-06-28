import { defaultModel } from "@/features/models";
import { PromptCategory, PromptDifficulty } from "@/features/prompts/types";
import { models } from "@/features/models/models";

export const getModelByPromptClassification = (
  promptCategory: PromptCategory,
  promptDifficulty: PromptDifficulty,
) => {
  switch (promptCategory) {
    case "general":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models.google["Gemini 2.5 Flash"].model;
        case "hard":
          return models.google["Gemini 2.5 Flash"].model;
        default:
          return defaultModel;
      }
    case "writing":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models.google["Gemini 2.5 Flash"].model;
        case "hard":
          return models.openai.o3.model;
        default:
          return defaultModel;
      }
    case "ui-code-gen":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models.google["Gemini 2.5 Flash"].model;
        case "hard":
          return models.anthropic["Claude 4 Sonnet"].model;
        default:
          return defaultModel;
      }
    case "stem":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models.xai["Grok 3 Mini"].model;
        case "hard":
          return models.openai["o4 mini"].model;
        default:
          return defaultModel;
      }
    case "search":
      switch (promptDifficulty) {
        case "easy":
          return models.perplexity.sonar.model;
        case "medium":
          return models.perplexity.sonar.model;
        case "hard":
          return models.perplexity["Sonar Reasoning Pro"].model;
        default:
          return models.perplexity.sonar.model;
      }
    default:
      return defaultModel;
  }
};
