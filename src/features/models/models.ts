import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const classifierModel = openRouter.chat(
  "google/gemini-2.5-flash-lite-preview-06-17",
);
export const searchModel = openRouter.chat("perplexity/sonar");
export const complexModel = openRouter.chat("openai/o4-mini-high");
export const generalModel = openRouter.chat("google/gemini-2.0-flash-001");
export const titleGeneratorModel = openRouter.chat(
  "google/gemini-2.0-flash-001",
);
