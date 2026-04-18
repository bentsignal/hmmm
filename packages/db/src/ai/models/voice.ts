import { openai } from "@ai-sdk/openai";

import type { TranscriptionModel } from "./types";

export const transcriptionModels = {
  "whisper-1": {
    provider: "OpenAI",
    name: "Whisper 1",
    model: openai.transcription("whisper-1"),
    cost: { in: 0, out: 0, other: 0.006 },
  },
} as const satisfies Record<string, TranscriptionModel>;
