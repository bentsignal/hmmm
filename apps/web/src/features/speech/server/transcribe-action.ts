import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { experimental_transcribe as transcribe } from "ai";

import { api } from "@acme/db/api";
import { modelPresets } from "@acme/db/models";

import { env } from "~/env";
import { getConvexHttpClient } from "~/lib/convex-server";
import { tryCatch } from "~/lib/utils";
import { MAX_AUDIO_FILE_SIZE, MAX_RECORDING_DURATION } from "../config";
import { getAudioDurationFromBuffer } from "../util/audio-duration";

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as ArrayBuffer)
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

    // validate file size
    if (audio.byteLength === 0) {
      throw new Error("Audio file is empty");
    }
    if (audio.byteLength > MAX_AUDIO_FILE_SIZE * 1024 * 1024) {
      throw new Error(
        `Audio file is too large. Maximum file size
      is ${MAX_AUDIO_FILE_SIZE} MB (OpenAI limit).`,
      );
    }

    const audioBuffer = Buffer.from(audio);

    // get audio duration
    const { data: duration, error: parsingError } = await tryCatch(
      getAudioDurationFromBuffer(audioBuffer),
    );

    // validate duration
    if (parsingError) {
      throw parsingError;
    }
    if (duration > MAX_RECORDING_DURATION) {
      throw new Error(
        `Audio duration is ${Math.round(duration)} seconds. Maximum recording
      duration is ${MAX_RECORDING_DURATION} seconds.`,
      );
    }

    // transcribe audio
    const { data: transcription, error } = await tryCatch(
      transcribe({
        model: modelPresets.transcription.model,
        audio: audioBuffer,
      }),
    );

    if (error) {
      console.error(error);
      return "Failed to transcribe audio, please try again.";
    }

    // log usage, billed per minute
    await convex.mutation(api.user.usage.logTranscription, {
      duration,
      apiKey: env.CONVEX_INTERNAL_KEY,
    });

    return transcription.text;
  });
