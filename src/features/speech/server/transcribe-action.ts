"use server";

import { experimental_transcribe as transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { env } from "@/env";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

export async function transcribeAudio(audio: ArrayBuffer) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const isUserSubscribed = await convex.query(api.auth.externalSubCheck, {
    userId,
  });
  if (!isUserSubscribed) {
    throw new Error("User is not subscribed");
  }
  const audioBuffer = Buffer.from(audio);
  const response = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: audioBuffer,
  });
  return response.text;
}
