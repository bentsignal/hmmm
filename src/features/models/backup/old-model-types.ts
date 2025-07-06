export type Provider =
  | "Google"
  | "Anthropic"
  | "OpenAI"
  | "DeepSeek"
  | "xAI"
  | "Meta"
  | "Perplexity";

export const providers = [
  "Google",
  "OpenAI",
  "Anthropic",
  "DeepSeek",
  "xAI",
  "Meta",
  "Perplexity",
];

export interface Model {
  provider: Provider;
  name: string;
  id: string;
  hidden?: boolean;
  pronunciations: string[];
  supportsToolCalls?: boolean;
}
