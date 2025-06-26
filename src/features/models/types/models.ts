import { Model, providers } from "./model-types";

export const models: Model[] = [
  /*

    Google

  */
  {
    provider: "Google",
    name: "Gemini 2.0 Flash",
    id: "google/gemini-2.0-flash-001",
    pronunciations: ["gemini 2.0 flash", "2.0 flash"],
    supportsToolCalls: true,
  },
  {
    provider: "Google",
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash",
    pronunciations: ["gemini 2.5 flash", "2.5 flash"],
    supportsToolCalls: true,
  },
  {
    provider: "Google",
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro",
    pronunciations: ["gemini 2.5 pro", "2.5 pro"],
    supportsToolCalls: true,
  },
  /*

    OpenAI

  */
  {
    provider: "OpenAI",
    name: "GPT 4.1",
    id: "openai/gpt-4.1-2025-04-14",
    pronunciations: ["gpt 4.1", "4.1"],
  },
  {
    provider: "OpenAI",
    name: "GPT 4o",
    id: "openai/gpt-4o-2024-11-20",
    pronunciations: [
      "gpt 4o",
      "4o",
      "gpt 40",
      "40",
      "gpt 4.0",
      "4.0",
      "gpt for oh",
      "for oh",
      "gpt for o",
      "for o",
    ],
  },
  {
    provider: "OpenAI",
    name: "o4 mini",
    id: "openai/o4-mini-2025-04-16",
    pronunciations: ["o4 mini", "04 mini", "oh 4 mini", "o 4 mini", "o4mini"],
    supportsToolCalls: true,
  },
  {
    provider: "OpenAI",
    name: "o3",
    id: "openai/o3-2025-04-16",
    pronunciations: ["o3", "oh 3", "o 3", "03"],
    supportsToolCalls: true,
  },
  /*
  
    Anthropic
  
  */
  {
    provider: "Anthropic",
    name: "Claude 4 Sonnet",
    id: "anthropic/claude-4-sonnet-20250522",
    pronunciations: [
      "claude 4 sonnet",
      "claude for sonnet",
      "claude four sonnet",
      "clod 4 sonnet",
      "clod 4",
      "clod for sonnet",
      "clod four sonnet",
      "claude force on it",
      "clod force on it",
      "quad 4 sonnet",
      "quad 4",
      "quad for sonnet",
      "quad four sonnet",
      "quad 4 sonnet",
      "quad 4",
      "quad force on it",
    ],
    supportsToolCalls: true,
  },
  {
    provider: "Anthropic",
    name: "Claude 3.5 Sonnet",
    id: "anthropic/claude-3.5-sonnet",
    pronunciations: [
      "claude 3.5 sonnet",
      "claude three five sonnet",
      "claude 3.5",
      "clod 3.5 sonnet",
      "clod three five sonnet",
      "clod 3.5",
      "quad 3.5 sonnet",
      "quad three five sonnet",
      "quad 3.5",
      "quad force on it",
    ],
    supportsToolCalls: true,
  },
  /*

    DeepSeek

  */
  {
    provider: "DeepSeek",
    name: "R1",
    id: "deepseek/deepseek-r1-0528:free",
    pronunciations: ["deepseek r1", "r1", "deep seek r1"],
  },
  {
    provider: "DeepSeek",
    name: "V3",
    id: "deepseek/deepseek-chat-v3-0324:free",
    pronunciations: ["deepseek v3", "v3", "deep seek v3"],
  },
  /*
  
    xAI
  
  */
  {
    provider: "xAI",
    name: "Grok 3 Mini",
    id: "x-ai/grok-3-mini-beta",
    pronunciations: [
      "grok 3 mini",
      "grok 3 mini beta",
      "glock 3 mini",
      "glock 3 mini beta",
      "rock 3 mini",
    ],
    supportsToolCalls: true,
  },
  {
    provider: "xAI",
    name: "Grok 3",
    id: "x-ai/grok-3-beta",
    pronunciations: [
      "grok 3",
      "grok 3 beta",
      "glock 3",
      "glock 3 beta",
      "rock 3",
    ],
    supportsToolCalls: true,
  },
  /*
  
    Meta
  
  */
  {
    provider: "Meta",
    name: "Llama 4 Maverick",
    id: "meta-llama/llama-4-maverick:free",
    pronunciations: [
      "llama 4 maverick",
      "maverick",
      "llama for maverick",
      "llama four maverick",
    ],
  },
  {
    provider: "Meta",
    name: "Llama 4 Scout",
    id: "meta-llama/llama-4-scout:free",
    pronunciations: [
      "llama 4 scout",
      "scout",
      "llama for scout",
      "llama four scout",
    ],
  },
  /*

    perplexity


  */
  {
    provider: "Perplexity",
    name: "Sonar",
    id: "perplexity/sonar",
    pronunciations: ["sonar", "sonar"],
  },
];

export const modelGroups = providers.map((provider) => {
  return {
    provider,
    models: models.filter(
      (model) => model.provider === provider && !model.hidden,
    ),
  };
});

export const publicModels = models.filter((model) => !model.hidden);

export const defaultModel =
  publicModels.find((model) => model.id === "google/gemini-2.0-flash-001") ??
  publicModels[0];

export const titleGenerator =
  publicModels.find((model) => model.id === "google/gemini-2.0-flash-001") ??
  publicModels[0];

export const searchModel = publicModels.find(
  (model) => model.id === "perplexity/sonar",
);
