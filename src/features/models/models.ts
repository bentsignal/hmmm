import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { openai } from "@ai-sdk/openai";

const OPEN_ROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPEN_ROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not set");
}

const openRouter = createOpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

export const models = {
  google: {
    label: "Google",
    "Gemini 2.0 Flash": {
      label: "Gemini 2.0 Flash",
      model: openRouter.chat("google/gemini-2.0-flash-001"),
    },
    "Gemini 2.5 Flash Lite": {
      label: "Gemini 2.5 Flash Lite",
      model: openRouter.chat("google/gemini-2.5-flash-lite-preview-06-17"),
    },
    "Gemini 2.5 Flash": {
      label: "Gemini 2.5 Flash",
      model: openRouter.chat("google/gemini-2.5-flash"),
    },
    "Gemini 2.5 Pro": {
      label: "Gemini 2.5 Pro",
      model: openRouter.chat("google/gemini-2.5-pro"),
    },
  },
  openai: {
    label: "OpenAI",
    "o4 mini": {
      label: "o4 mini",
      model: openRouter.chat("openai/o4-mini-high"),
    },
    o3: {
      label: "o3",
      model: openRouter.chat("openai/o3-2025-04-16"),
    },
    "Whisper 1": {
      label: "Whisper 1",
      model: openai.transcription("whisper-1"),
    },
  },
  anthropic: {
    label: "Anthropic",
    "Claude 4 Sonnet": {
      label: "Claude 4 Sonnet",
      model: openRouter.chat("anthropic/claude-4-sonnet-20250522"),
    },
  },
  xai: {
    label: "xAI",
    "Grok 3 Mini": {
      label: "Grok 3 Mini",
      model: openRouter.chat("x-ai/grok-3-mini"),
    },
  },
  perplexity: {
    label: "Perplexity",
    sonar: {
      label: "Sonar",
      model: openRouter.chat("perplexity/sonar"),
    },
    "Sonar Reasoning Pro": {
      label: "Sonar Reasoning Pro",
      model: openRouter.chat("perplexity/sonar-reasoning-pro"),
    },
  },
};

export const defaultModel = models.google["Gemini 2.0 Flash"].model;

// used to classify prompt category and difficulty
export const classifierModel = models.google["Gemini 2.5 Flash Lite"].model;

// used to search the web
export const searchModel = models.perplexity.sonar.model;

// used to generate a title for a thread
export const titleGeneratorModel = models.google["Gemini 2.0 Flash"].model;

// used to transcribe audio to text
export const transcriptionModel = models.openai["Whisper 1"].model;
