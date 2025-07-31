import { embeddingModels, languageModels, transcriptionModels } from "./models";

export const defaultModel = languageModels["gemini-2.5-flash"];
export const classifierModel = languageModels["gemini-2.5-flash-lite"];
export const followUpModel = languageModels["gemini-2.0-flash"];
export const titleGeneratorModel = languageModels["gemini-2.0-flash"];
export const transcriptionModel = transcriptionModels["whisper-1"];
export const searchModel = languageModels["sonar"];
export const embeddingModel = embeddingModels["text-embedding-3-small"];
