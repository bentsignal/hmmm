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
  /*

    Google

  */
  "google/gemini-2.0-flash-001": {
    provider: "Google",
    name: "Gemini 2.0 Flash",
    id: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    model: openRouter.chat("google/gemini-2.0-flash-001"),
    cost: {
      in: 0.1,
      out: 0.4,
      other: 0,
    },
    pronunciations: ["gemini 2.0 flash", "2.0 flash"],
  },
  "google/gemini-2.5-flash-lite-preview-06-17": {
    provider: "Google",
    name: "Gemini 2.5 Flash Lite",
    id: "google/gemini-2.5-flash-lite-preview-06-17",
    label: "Gemini 2.5 Flash Lite",
    model: openRouter.chat("google/gemini-2.5-flash-lite-preview-06-17"),
    cost: {
      in: 0.1,
      out: 0.4,
      other: 0,
    },
    pronunciations: ["gemini 2.5 flash lite", "2.5 flash lite"],
  },
  "google/gemini-2.5-flash": {
    provider: "Google",
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    model: openRouter.chat("google/gemini-2.5-flash"),
    cost: {
      in: 0.3,
      out: 2.5,
      other: 0,
    },
    pronunciations: ["gemini 2.5 flash", "2.5 flash"],
  },
  "google/gemini-2.5-pro": {
    provider: "Google",
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    model: openRouter.chat("google/gemini-2.5-pro"),
    cost: {
      in: 2.5,
      out: 15,
      other: 0,
    },
    pronunciations: ["gemini 2.5 pro", "2.5 pro"],
  },
  /*

    OpenAI

  */
  "openai/o4-mini-high": {
    provider: "OpenAI",
    name: "o4 mini",
    id: "openai/o4-mini-high",
    label: "o4 mini",
    model: openRouter.chat("openai/o4-mini-high"),
    cost: {
      in: 1.1,
      out: 4.4,
      other: 0,
    },
    pronunciations: ["o4 mini", "04 mini", "oh 4 mini", "o 4 mini", "o4mini"],
  },
  "openai/o3-2025-04-16": {
    provider: "OpenAI",
    name: "o3",
    id: "openai/o3-2025-04-16",
    label: "o3",
    model: openRouter.chat("openai/o3-2025-04-16"),
    cost: {
      in: 2,
      out: 8,
      other: 0,
    },
    pronunciations: ["o3", "oh 3", "o 3", "03"],
  },
  "whisper-1": {
    provider: "OpenAI",
    name: "Whisper 1",
    id: "whisper-1",
    label: "Whisper 1",
    model: openai.transcription("whisper-1"),
    cost: {
      in: 0,
      out: 0,
      other: 0.006,
    },
    pronunciations: ["whisper 1", "whisper one"],
  },
  /*

    Anthropic

  */
  "anthropic/claude-4-sonnet-20250522": {
    provider: "Anthropic",
    name: "Claude 4 Sonnet",
    id: "anthropic/claude-4-sonnet-20250522",
    label: "Claude 4 Sonnet",
    model: openRouter.chat("anthropic/claude-4-sonnet-20250522"),
    cost: {
      in: 3,
      out: 15,
      other: 0,
    },
    pronunciations: [
      "claude 4 sonnet",
      "claude for sonnet",
      "claude four sonnet",
      "clod 4 sonnet",
      "clod 4",
      "clod for sonnet",
      "clod four sonnet",
      "claude force on it",
      "clod force on it",
      "quad 4 sonnet",
      "quad 4",
      "quad for sonnet",
      "quad four sonnet",
      "quad 4 sonnet",
      "quad 4",
      "quad force on it",
    ],
  },
  /*

    xAI

  */
  "x-ai/grok-3-mini": {
    provider: "xAI",
    name: "Grok 3 Mini",
    id: "x-ai/grok-3-mini",
    label: "Grok 3 Mini",
    model: openRouter.chat("x-ai/grok-3-mini"),
    cost: {
      in: 0.3,
      out: 0.5,
      other: 0,
    },
    pronunciations: [
      "grok 3 mini",
      "grok 3 mini beta",
      "glock 3 mini",
      "glock 3 mini beta",
      "rock 3 mini",
    ],
  },
  /*

    Perplexity

  */
  "perplexity/sonar": {
    provider: "Perplexity",
    name: "Sonar",
    id: "perplexity/sonar",
    label: "Sonar",
    model: openRouter.chat("perplexity/sonar"),
    cost: {
      in: 1,
      out: 1,
      other: 0.005,
    },
    pronunciations: ["sonar"],
  },
  "perplexity/sonar-reasoning-pro": {
    provider: "Perplexity",
    name: "Sonar Reasoning Pro",
    id: "perplexity/sonar-reasoning-pro",
    label: "Sonar Reasoning Pro",
    model: openRouter.chat("perplexity/sonar-reasoning-pro"),
    cost: {
      in: 2,
      out: 8,
      other: 0.005,
    },
    pronunciations: ["sonar reasoning pro", "sonar reasoning", "sonar pro"],
  },
};

export const defaultModel = models["google/gemini-2.0-flash-001"];

export const classifierModel =
  models["google/gemini-2.5-flash-lite-preview-06-17"];

export const titleGeneratorModel = models["google/gemini-2.0-flash-001"];

export const transcriptionModel = models["whisper-1"];

export const searchModel = models["perplexity/sonar"];
