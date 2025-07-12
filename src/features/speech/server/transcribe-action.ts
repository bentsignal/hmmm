"use server";

import { env } from "@/env";
import { auth } from "@clerk/nextjs/server";
import { experimental_transcribe as transcribe } from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { MAX_AUDIO_FILE_SIZE, MAX_RECORDING_DURATION } from "../config";
import { getAudioDurationFromBuffer } from "../util/audio-duration";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util/auth-util";
import { transcriptionModel } from "@/features/models/models";

export async function transcribeAudio(audio: ArrayBuffer) {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // usage check
  const authToken = await getAuthToken();
  const usage = await fetchQuery(api.usage.getUsage, {}, { token: authToken });
  if (usage.limitHit) {
    throw new Error("User has reached usage limit");
  }

  // rate limit
  const rateLimit = await fetchMutation(
    api.limiter.transcriptionRateLimit,
    { userId },
    { token: authToken },
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

  // get audio duration
  const audioBuffer = Buffer.from(audio);
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
      model: transcriptionModel.model,
      audio: audioBuffer,
    }),
  );

  if (error) {
    console.error(error);
    return "Failed to transcribe audio, please try again.";
  }

  // log usage, billed per minute
  const cost = (transcriptionModel.cost.other * Math.ceil(duration)) / 60;
  await fetchMutation(
    api.messages.logTranscriptionUsage,
    {
      model: transcriptionModel.id,
      cost: transcriptionModel.cost.other,
      totalCost: cost,
      key: env.NEXT_CONVEX_INTERNAL_KEY,
    },
    { token: authToken },
  );

  return transcription.text;
}
