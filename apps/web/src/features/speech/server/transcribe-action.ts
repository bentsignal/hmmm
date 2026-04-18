import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { experimental_transcribe as transcribe } from "ai";

import { api } from "@acme/db/api";
import { modelPresets } from "@acme/db/models/presets";
import {
  MAX_AUDIO_FILE_SIZE,
  MAX_RECORDING_DURATION,
} from "@acme/features/speech";

import { env } from "~/env";
import { getConvexHttpClient } from "~/lib/convex-server";
import { getAudioDurationFromBuffer } from "../util/audio-duration";

function validateInputData(data: unknown) {
  if (!(data instanceof ArrayBuffer)) {
    throw new Error("Expected ArrayBuffer input");
  }
  return data;
}

function validateFileSize(audio: ArrayBuffer) {
  if (audio.byteLength === 0) {
    throw new Error("Audio file is empty");
  }
  if (audio.byteLength > MAX_AUDIO_FILE_SIZE * 1024 * 1024) {
    throw new Error(
      `Audio file is too large. Maximum file size
      is ${MAX_AUDIO_FILE_SIZE} MB (OpenAI limit).`,
    );
  }
}

function validateDuration(duration: number) {
  if (duration > MAX_RECORDING_DURATION) {
    throw new Error(
      `Audio duration is ${Math.round(duration)} seconds. Maximum recording
      duration is ${MAX_RECORDING_DURATION} seconds.`,
    );
  }
}

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validateInputData(data))
  .handler(async ({ data: audio }) => {
    // auth check
    const { userId, getToken } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const token = (await getToken({ template: "convex" })) ?? undefined;
    const convex = getConvexHttpClient();
    if (token) {
      convex.setAuth(token);
    }

    // usage check
    const usage = await convex.query(api.user.usage.getUsage, {});
    if (usage.limitHit) {
      throw new Error("User has reached usage limit");
    }

    // rate limit
    const rateLimit = await convex.mutation(
      api.limiter.transcriptionRateLimit,
      {},
    );
    if (!rateLimit) {
      throw new Error("Rate limit exceeded");
    }

    validateFileSize(audio);

    const audioBuffer = Buffer.from(audio);

    // get audio duration
    let duration: number;
    try {
      duration = await getAudioDurationFromBuffer(audioBuffer);
    } catch (err) {
      throw new Error("Failed to parse audio duration", { cause: err });
    }
    validateDuration(duration);

    // transcribe audio
    let transcription: Awaited<ReturnType<typeof transcribe>>;
    try {
      transcription = await transcribe({
        model: modelPresets.transcription.model,
        audio: audioBuffer,
      });
    } catch (err) {
      console.error(err);
      return "Failed to transcribe audio, please try again.";
    }

    // log usage, billed per minute
    await convex.mutation(api.user.usage.logTranscription, {
      duration,
      apiKey: env.CONVEX_INTERNAL_KEY,
    });

    return transcription.text;
  });
