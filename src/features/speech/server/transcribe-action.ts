"use server";

import { experimental_transcribe as transcribe } from "ai";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";
import { transcriptionModel } from "@/features/models/models";
import { getAuthToken } from "@/features/auth/util/auth-util";
import { fetchQuery } from "convex/nextjs";

export async function transcribeAudio(audio: ArrayBuffer) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const authToken = await getAuthToken();
  const usage = await fetchQuery(api.usage.getUsage, {}, { token: authToken });
  if (usage.limitHit) {
    throw new Error("User has reached usage limit");
  }
  const audioBuffer = Buffer.from(audio);
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
  return transcription.text;
}
