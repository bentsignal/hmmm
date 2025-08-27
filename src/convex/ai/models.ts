import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import type { OpenRouterProviderOptions } from "@openrouter/ai-sdk-provider";
import type {
  EmbeddingModel as EmbeddingModelV2,
  LanguageModel as LanguageModelV2,
  TranscriptionModel as TranscriptionModelV2,
} from "ai";
import z from "zod";

interface Model {
  provider: string;
  name: string;
  openrouterProviderOptions?: OpenRouterProviderOptions;
  cost: {
    in: number;
    out: number;
    other: number;
  };
}

export const OpenRouterProviderMetadata = z.object({
  openrouter: z.object({
    usage: z.object({
      cost: z.number(),
    }),
  }),
});

export interface LanguageModel extends Model {
  model: LanguageModelV2;
  /**
   * @deprecated currently unused, static options are passed to agent in `agents.ts`
   */
  openrouterProviderOptions?: OpenRouterProviderOptions;
}

export interface TranscriptionModel extends Model {
  model: TranscriptionModelV2;
}

export interface EmbeddingModel extends Model {
  model: EmbeddingModelV2<string>;
}

export interface ImageGenerationModel extends Model {
  type: "text-to-image" | "image-to-image";
}

export interface FalImageGenerationModel extends ImageGenerationModel {
  model:
    | "fal-ai/imagen4/preview/ultra"
    | "fal-ai/flux-1/krea"
    | "fal-ai/qwen-image-edit"
    | "fal-ai/gemini-25-flash-image/edit"
    | "fal-ai/gemini-25-flash-image";
}

export const falImageGenerationModels = {
  krea: {
    provider: "Flux",
    name: "Krea",
    model: "fal-ai/flux-1/krea",
    type: "text-to-image",
    cost: {
      in: 0,
      out: 0,
      other: 0.03,
    },
  },
  "imagen4-ultra": {
    provider: "Google",
    name: "Imagen 4 Ultra",
    model: "fal-ai/imagen4/preview/ultra",
    type: "text-to-image",
    cost: {
      in: 0,
      out: 0,
      other: 0.06,
    },
  },
  "fal-ai/qwen-image-edit": {
    provider: "Qwen",
    name: "Qwen Image to Image",
    model: "fal-ai/qwen-image-edit",
    type: "image-to-image",
    cost: {
      in: 0,
      out: 0,
      other: 0.03,
    },
  },
  "fal-ai/gemini-25-flash-image/edit": {
    provider: "Google",
    name: "Gemini 2.5 Flash Image Edit",
    model: "fal-ai/gemini-25-flash-image/edit",
    type: "image-to-image",
    cost: {
      in: 0,
      out: 0,
      other: 0.04,
    },
  },
  "fal-ai/gemini-25-flash-image": {
    provider: "Google",
    name: "Gemini 2.5 Flash Image",
    model: "fal-ai/gemini-25-flash-image",
    type: "text-to-image",
    cost: {
      in: 0,
      out: 0,
      other: 0.04,
    },
  },
} as const satisfies Record<string, FalImageGenerationModel>;

export const transcriptionModels = {
  /*

    Open AI

  */
  "whisper-1": {
    provider: "OpenAI",
    name: "Whisper 1",
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
    model: openrouter("openai/gpt-5"),
    cost: {
      in: 1.25,
      out: 10,
      other: 0,
    },
  },
  "gpt-5-mini": {
    provider: "OpenAI",
    name: "GPT-5 Mini",
    model: openai("gpt-5-mini"),
    cost: {
      in: 0.25,
      out: 2,
      other: 0,
    },
  },
  "gpt-5-nano": {
    provider: "OpenAI",
    name: "GPT-5 Nano",
    model: openai("gpt-5-nano"),
    cost: {
      in: 0.05,
      out: 0.4,
      other: 0,
    },
  },
  /*

    Anthropic

  */
  "claude-4-sonnet": {
    provider: "Anthropic",
    name: "Claude 4 Sonnet",
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
