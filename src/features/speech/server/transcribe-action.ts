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
  const isUserSubscribed = await fetchQuery(
    api.auth.isUserSubscribed,
    {},
    { token: authToken },
  );
  if (!isUserSubscribed) {
    throw new Error("User is not subscribed");
  }
  const audioBuffer = Buffer.from(audio);
  const { data: transcription, error } = await tryCatch(
    transcribe({
      model: transcriptionModel,
      audio: audioBuffer,
    }),
  );
  if (error) {
    console.error(error);
    return "Failed to transcribe audio, please try again.";
  }
  return transcription.text;
}
