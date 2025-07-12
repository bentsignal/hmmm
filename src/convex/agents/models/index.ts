import { models } from "./models";

export * from "./models";

export const defaultModel = models["google/gemini-2.0-flash-001"];

export const classifierModel =
  models["google/gemini-2.5-flash-lite-preview-06-17"];

export const titleGeneratorModel = models["google/gemini-2.0-flash-001"];

export const transcriptionModel = models["whisper-1"];

export const searchModel = models["perplexity/sonar"];
