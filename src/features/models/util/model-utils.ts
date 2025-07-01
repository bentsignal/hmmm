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
          return models["google/gemini-2.5-flash"];
        case "hard":
          return models["google/gemini-2.5-flash"];
        default:
          return defaultModel;
      }
    case "writing":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models["google/gemini-2.5-flash"];
        case "hard":
          return models["openai/o3-2025-04-16"];
        default:
          return defaultModel;
      }
    case "ui-code-gen":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models["google/gemini-2.5-flash"];
        case "hard":
          return models["anthropic/claude-4-sonnet-20250522"];
        default:
          return defaultModel;
      }
    case "stem":
      switch (promptDifficulty) {
        case "easy":
          return defaultModel;
        case "medium":
          return models["x-ai/grok-3-mini"];
        case "hard":
          return models["openai/o4-mini-high"];
        default:
          return defaultModel;
      }
    case "search":
      switch (promptDifficulty) {
        case "easy":
          return models["perplexity/sonar"];
        case "medium":
          return models["perplexity/sonar"];
        case "hard":
          return models["perplexity/sonar-reasoning-pro"];
        default:
          return models["perplexity/sonar"];
      }
    default:
      return defaultModel;
  }
};
