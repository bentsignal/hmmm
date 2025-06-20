"use server";

import { experimental_transcribe as transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { env } from "@/env";
import { tryCatch } from "@/lib/utils";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

export async function transcribeAudio(audio: ArrayBuffer) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const isUserSubscribed = await convex.query(api.auth.externalSubCheck, {
    userId,
    key: env.CONVEX_INTERNAL_API_KEY,
  });
  if (!isUserSubscribed) {
    throw new Error("User is not subscribed");
  }
  const audioBuffer = Buffer.from(audio);
  const { data: transcription, error } = await tryCatch(
    transcribe({
      model: openai.transcription("whisper-1"),
      audio: audioBuffer,
    }),
  );
  if (error) {
    console.error(error);
    return "Failed to transcribe audio, please try again.";
  }
  return transcription.text;
}
