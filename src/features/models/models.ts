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
      pronunciations: ["gemini 2.0 flash", "2.0 flash"],
      model: openRouter.chat("google/gemini-2.0-flash-001"),
    },
    "Gemini 2.5 Flash Lite": {
      label: "Gemini 2.5 Flash Lite",
      pronunciations: ["gemini 2.5 flash lite", "2.5 flash lite"],
      model: openRouter.chat("google/gemini-2.5-flash-lite-preview-06-17"),
    },
    "Gemini 2.5 Flash": {
      label: "Gemini 2.5 Flash",
      pronunciations: ["gemini 2.5 flash", "2.5 flash"],
      model: openRouter.chat("google/gemini-2.5-flash"),
    },
    "Gemini 2.5 Pro": {
      label: "Gemini 2.5 Pro",
      pronunciations: ["gemini 2.5 pro", "2.5 pro"],
      model: openRouter.chat("google/gemini-2.5-pro"),
    },
  },
  openai: {
    label: "OpenAI",
    "o4 mini": {
      label: "o4 mini",
      pronunciations: ["o4 mini", "04 mini", "oh 4 mini", "o 4 mini", "o4mini"],
      model: openRouter.chat("openai/o4-mini-high"),
    },
    "Whisper 1": {
      label: "Whisper 1",
      pronunciations: ["whisper 1", "whisper one", "whisper one 1"],
      model: openai.transcription("whisper-1"),
    },
  },
  perplexity: {
    label: "Perplexity",
    sonar: {
      label: "Sonar",
      pronunciations: ["sonar"],
      model: openRouter.chat("perplexity/sonar"),
    },
  },
};

export const classifierModel = models.google["Gemini 2.5 Flash Lite"].model;
export const searchModel = models.perplexity.sonar.model;
export const complexModel = models.openai["o4 mini"].model;
export const generalModel = models.google["Gemini 2.0 Flash"].model;
export const titleGeneratorModel = models.google["Gemini 2.0 Flash"].model;
export const transcriptionModel = models.openai["Whisper 1"].model;
