import type {
  EmbeddingModel as EmbeddingModelV2,
  LanguageModel as LanguageModelV2,
  TranscriptionModel as TranscriptionModelV2,
} from "ai";
import z from "zod";

interface Model {
  provider: string;
  name: string;
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

export const GatewayProviderMetadata = z.object({
  gateway: z.object({
    cost: z.string(),
  }),
});

export interface LanguageModel extends Model {
  available: boolean;
  model: LanguageModelV2;
}

export type PublicLanguageModel = Omit<
  LanguageModel,
  "model" | "cost" | "available"
>;

export interface TranscriptionModel extends Model {
  model: TranscriptionModelV2;
}

export interface EmbeddingModel extends Model {
  model: EmbeddingModelV2;
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
