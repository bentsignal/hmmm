export type Provider =
  | "Google"
  | "Anthropic"
  | "OpenAI"
  | "DeepSeek"
  | "xAI"
  | "Meta";

export const providers = [
  "Google",
  "OpenAI",
  "Anthropic",
  "DeepSeek",
  "xAI",
  "Meta",
];

export interface Model {
  provider: Provider;
  name: string;
  id: string;
  hidden?: boolean;
}

export const models: Model[] = [
  /*

    Google

  */
  {
    provider: "Google",
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash-preview-05-20",
  },
  {
    provider: "Google",
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro-preview-06-05",
  },
  {
    provider: "Google",
    name: "Gemma 3",
    id: "google/gemma-3-4b-it",
    hidden: true,
  },
  /*

    OpenAI

  */
  {
    provider: "OpenAI",
    name: "GPT 4.1",
    id: "openai/gpt-4.1-2025-04-14",
  },
  {
    provider: "OpenAI",
    name: "GPT 4o",
    id: "openai/gpt-4o-2024-11-20",
  },
  {
    provider: "OpenAI",
    name: "o4 mini",
    id: "openai/o4-mini-2025-04-16",
  },
  {
    provider: "OpenAI",
    name: "o3",
    id: "openai/o3-2025-04-16",
  },
  /*
  
    Anthropic
  
  */
  {
    provider: "Anthropic",
    name: "Claude 4 Sonnet",
    id: "anthropic/claude-4-sonnet-20250522",
  },
  {
    provider: "Anthropic",
    name: "Claude 3.5 Sonnet",
    id: "anthropic/claude-3.5-sonnet",
  },
  /*

    DeepSeek

  */
  {
    provider: "DeepSeek",
    name: "R1",
    id: "deepseek/deepseek-r1-0528:free",
  },
  {
    provider: "DeepSeek",
    name: "V3",
    id: "deepseek/deepseek-chat-v3-0324:free",
  },
  /*
  
    xAI
  
  */
  {
    provider: "xAI",
    name: "Grok 3",
    id: "x-ai/grok-3-beta",
  },
  {
    provider: "xAI",
    name: "Grok 3 Mini",
    id: "x-ai/grok-3-mini-beta",
  },
  /*
  
    Meta
  
  */
  {
    provider: "Meta",
    name: "Llama 4 Maverick",
    id: "meta-llama/llama-4-maverick:free",
  },
  {
    provider: "Meta",
    name: "Llama 4 Scout",
    id: "meta-llama/llama-4-scout:free",
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
