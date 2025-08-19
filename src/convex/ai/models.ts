import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import type { OpenRouterProviderOptions } from "@openrouter/ai-sdk-provider";
import type {
  EmbeddingModel as EmbeddingModelV1,
  LanguageModelV1,
  TranscriptionModel as TranscriptionModelV1,
} from "ai";

interface Model {
  provider: string;
  name: string;
  id: string;
  openrouterProviderOptions?: OpenRouterProviderOptions;
  cost: {
    in: number;
    out: number;
    other: number;
  };
}

export interface LanguageModel extends Model {
  model: LanguageModelV1;
  /**
   * @deprecated currently unused, static options are passed to agent in `agents.ts`
   */
  openrouterProviderOptions?: OpenRouterProviderOptions;
}

export interface TranscriptionModel extends Model {
  model: TranscriptionModelV1;
}

export interface EmbeddingModel extends Model {
  model: EmbeddingModelV1<string>;
}

export const transcriptionModels = {
  /*

    Open AI

  */
  "whisper-1": {
    provider: "OpenAI",
    name: "Whisper 1",
    id: "whisper-1",
    model: openai.transcription("whisper-1"),
    cost: {
      in: 0,
      out: 0,
      other: 0.006,
    },
  },
} as const satisfies Record<string, TranscriptionModel>;

export const embeddingModels = {
  "text-embedding-3-small": {
    provider: "OpenAI",
    name: "Text Embedding 3 Small",
    id: "text-embedding-3-small",
    model: openai.embedding("text-embedding-3-small"),
    cost: {
      in: 0.02,
      out: 0,
      other: 0,
    },
  },
} as const satisfies Record<string, EmbeddingModel>;

export const languageModels = {
  /*

    Google

  */
  "gemini-2.0-flash": {
    provider: "Google",
    name: "Gemini 2.0 Flash",
    id: "google/gemini-2.0-flash-001",
    model: openrouter("google/gemini-2.0-flash-001"),
    cost: {
      in: 0.1,
      out: 0.4,
      other: 0,
    },
  },
  "gemini-2.5-flash-lite": {
    provider: "Google",
    name: "Gemini 2.5 Flash Lite",
    id: "google/gemini-2.5-flash-lite-preview-06-17",
    model: openrouter("google/gemini-2.5-flash-lite-preview-06-17"),
    cost: {
      in: 0.1,
      out: 0.4,
      other: 0,
    },
  },
  "gemini-2.5-flash": {
    provider: "Google",
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash",
    model: openrouter("google/gemini-2.5-flash"),
    cost: {
      in: 0.3,
      out: 2.5,
      other: 0,
    },
    openrouterProviderOptions: {
      reasoning: {
        max_tokens: 6000,
      },
    },
  },
  "gemini-2.5-pro": {
    provider: "Google",
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro",
    model: openrouter("google/gemini-2.5-pro"),
    cost: {
      in: 2.5,
      out: 15,
      other: 0,
    },
    openrouterProviderOptions: {
      reasoning: {
        max_tokens: 6000,
      },
    },
  },
  /*

    OpenAI

  */
  "o4-mini": {
    provider: "OpenAI",
    name: "o4 mini",
    id: "openai/o4-mini",
    model: openrouter("openai/o4-mini"),
    cost: {
      in: 1.1,
      out: 4.4,
      other: 0,
    },
  },
  o3: {
    provider: "OpenAI",
    name: "o3",
    id: "openai/o3-2025-04-16",
    model: openrouter("openai/o3-2025-04-16"),
    cost: {
      in: 2,
      out: 8,
      other: 0,
    },
  },
  "oss-120b": {
    provider: "OpenAI",
    name: "GPT-OSS 120b",
    id: "openai/gpt-oss-120b",
    model: openrouter("openai/gpt-oss-120b"),
    cost: {
      in: 0.15,
      out: 0.6,
      other: 0,
    },
  },
  "oss-20b": {
    provider: "OpenAI",
    name: "GPT-OSS 20b",
    id: "openai/gpt-oss-20b",
    model: openrouter("openai/gpt-oss-20b"),
    cost: {
      in: 0.05,
      out: 0.2,
      other: 0,
    },
  },
  "gpt-5": {
    provider: "OpenAI",
    name: "GPT-5",
    id: "openai/gpt-5",
    model: openai("gpt-5"),
    cost: {
      in: 1.25,
      out: 10,
      other: 0,
    },
  },
  /*

    Anthropic

  */
  "claude-4-sonnet": {
    provider: "Anthropic",
    name: "Claude 4 Sonnet",
    id: "anthropic/claude-sonnet-4",
    model: openrouter("anthropic/claude-sonnet-4"),
    cost: {
      in: 3,
      out: 15,
      other: 0,
    },
    openrouterProviderOptions: {
      reasoning: {
        max_tokens: 16000,
      },
    },
  },
  /*

    xAI

  */
  "grok-3-mini": {
    provider: "xAI",
    name: "Grok 3 Mini",
    id: "x-ai/grok-3-mini",
    model: openrouter("x-ai/grok-3-mini"),
    cost: {
      in: 0.3,
      out: 0.5,
      other: 0,
    },
  },
  "grok-4": {
    provider: "xAI",
    name: "Grok 4",
    id: "x-ai/grok-4",
    model: openrouter("x-ai/grok-4"),
    cost: {
      in: 3,
      out: 15,
      other: 0,
    },
  },
  /*

    Perplexity

  */
  sonar: {
    provider: "Perplexity",
    name: "Sonar",
    id: "perplexity/sonar",
    model: openrouter("perplexity/sonar"),
    cost: {
      in: 1,
      out: 1,
      other: 0.005,
    },
  },
  "sonar-reasoning-pro": {
    provider: "Perplexity",
    name: "Sonar Reasoning Pro",
    id: "perplexity/sonar-reasoning-pro",
    model: openrouter("perplexity/sonar-reasoning-pro"),
    cost: {
      in: 2,
      out: 8,
      other: 0.005,
    },
  },
  /*

    Switchpoint

  */
  "switchpoint-router": {
    provider: "Switchpoint",
    name: "Switchpoint Router",
    id: "switchpoint/router",
    model: openrouter("switchpoint/router"),
    cost: {
      in: 0.85,
      out: 3.4,
      other: 0,
    },
  },
  /*

    Moonshot

  */
  "kimi-k2": {
    provider: "Moonshot",
    name: "Kimi K2",
    id: "moonshotai/kimi-k2",
    model: openrouter("@preset/kimi-k2"),
    cost: {
      in: 1,
      out: 3,
      other: 0,
    },
  },
  /*

    Inception

  */
  "mercury-coder": {
    provider: "Inception",
    name: "Mercury Coder",
    id: "inception/mercury-coder",
    model: openrouter("inception/mercury-coder"),
    cost: {
      in: 0.25,
      out: 1,
      other: 0,
    },
  },
  /*

    Alibaba

  */
  "qwen-3-235b": {
    provider: "Alibaba",
    name: "Qwen 3 235B",
    id: "alibaba/qwen-3-235b",
    model: openrouter("@preset/qwen-cerebras"),
    cost: {
      in: 0.6,
      out: 1.2,
      other: 0,
    },
  },
  /*

    z-ai

  */
  "glm-4.5": {
    provider: "z-ai",
    name: "GLM 4.5",
    id: "z-ai/glm-4.5",
    model: openrouter("z-ai/glm-4.5"),
    cost: {
      in: 0.6,
      out: 2.2,
      other: 0,
    },
    openrouterProviderOptions: {
      reasoning: {
        max_tokens: 6000,
      },
    },
  },
  /*

    Open router

  */
  "horizon-alpha": {
    provider: "Open Router",
    name: "Horizon Alpha",
    id: "openrouter/horizon-alpha",
    model: openrouter("openrouter/horizon-alpha"),
    cost: {
      in: 0,
      out: 0,
      other: 0,
    },
    openrouterProviderOptions: {
      reasoning: {
        max_tokens: 6000,
      },
    },
  },
} as const satisfies Record<string, LanguageModel>;

export const modelPresets = {
  default: languageModels["gemini-2.5-flash"],
  classifier: languageModels["gemini-2.5-flash-lite"],
  followUp: languageModels["gemini-2.0-flash"],
  titleGenerator: languageModels["gemini-2.0-flash"],
  transcription: transcriptionModels["whisper-1"],
  search: languageModels["sonar"],
  embedding: embeddingModels["text-embedding-3-small"],
};
