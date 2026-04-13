import { openai } from "@ai-sdk/openai";

import type {
  EmbeddingModel,
  PublicLanguageModel,
  TranscriptionModel,
} from "./types";
import { languageModels } from "./language";

export const transcriptionModels = {
  "whisper-1": {
    provider: "OpenAI",
    name: "Whisper 1",
    model: openai.transcription("whisper-1"),
    cost: { in: 0, out: 0, other: 0.006 },
  },
} as const satisfies Record<string, TranscriptionModel>;

export const embeddingModels = {
  "text-embedding-3-small": {
    provider: "OpenAI",
    name: "Text Embedding 3 Small",
    model: openai.embedding("text-embedding-3-small"),
    cost: { in: 0.02, out: 0, other: 0 },
  },
} as const satisfies Record<string, EmbeddingModel>;

export function getPublicLanguageModels() {
  return Object.fromEntries(
    Object.entries(languageModels)
      .filter(([, modelData]) => modelData.available)
      .map(([modelId, modelData]) => {
        const {
          model: _model,
          cost: _cost,
          available: _available,
          ...publicModel
        } = modelData;
        return [modelId, publicModel] satisfies [string, PublicLanguageModel];
      }),
  );
}

export function getModel(modelId?: string) {
  if (!modelId) {
    return modelPresets.default;
  }
  if (isLanguageModelKey(modelId) && languageModels[modelId].available) {
    return languageModels[modelId];
  }
  return modelPresets.default;
}

function isLanguageModelKey(key: string): key is keyof typeof languageModels {
  return key in languageModels;
}

export const modelPresets = {
  default: languageModels["gemini-2.5-flash"],
  classifier: languageModels["gemini-2.5-flash-lite"],
  followUp: languageModels["gemini-2.0-flash"],
  titleGenerator: languageModels["gemini-2.5-flash-lite"],
  transcription: transcriptionModels["whisper-1"],
  search: languageModels.sonar,
  embedding: embeddingModels["text-embedding-3-small"],
  code: languageModels["gpt-5.2"],
};
