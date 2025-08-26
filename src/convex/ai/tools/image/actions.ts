"use node";

import crypto from "node:crypto";
import { v } from "convex/values";
import { internalAction } from "@/convex/_generated/server";
import { falImageGenerationModels } from "@/convex/ai/models";
import {
  downloadImage,
  editImageFalAI,
  generateImageFalAI,
  saveImage,
} from "./helpers";
import { vAspectRatio } from "./types";
import { tryCatch } from "@/lib/utils";

globalThis.crypto = crypto as unknown as Crypto;

type GenerateImageOutput = {
  success: boolean;
  value: string;
};

export const generate = internalAction({
  args: v.object({
    prompt: v.string(),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    aspectRatio: vAspectRatio,
  }),
  handler: async (ctx, args): Promise<GenerateImageOutput> => {
    const { prompt, userId, threadId, aspectRatio } = args;

    // generate image
    const generation = await tryCatch(
      generateImageFalAI(
        prompt,
        aspectRatio,
        falImageGenerationModels["fal-ai/gemini-25-flash-image"],
      ),
    );
    if (generation.error) {
      console.error(generation.error);
      return {
        success: false,
        value: "Ran into an issue while generating the image.",
      };
    }

    // download image data from url
    const download = await tryCatch(downloadImage(generation.data));
    if (download.error) {
      console.error(download.error);
      return {
        success: false,
        value: "Ran into an issue while downloading the image.",
      };
    }

    // save result to user's library
    const save = await tryCatch(
      saveImage(ctx, prompt, download.data, userId, threadId),
    );
    if (save.error) {
      console.error(save.error);
      return {
        success: false,
        value: "Ran into an issue while saving the image.",
      };
    }

    return {
      success: true,
      value: save.data,
    };
  },
});

export const edit = internalAction({
  args: v.object({
    prompt: v.string(),
    urls: v.array(v.string()),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<GenerateImageOutput> => {
    const { prompt, urls, userId, threadId } = args;

    // edit image
    const editResult = await tryCatch(
      editImageFalAI(
        prompt,
        urls,
        falImageGenerationModels["fal-ai/gemini-25-flash-image/edit"],
      ),
    );
    if (editResult.error) {
      console.error(editResult.error);
      return {
        success: false,
        value: "Ran into an issue while editing the image.",
      };
    }

    // download image data from url
    const download = await tryCatch(downloadImage(editResult.data));
    if (download.error) {
      console.error(download.error);
      return {
        success: false,
        value: "Ran into an issue while downloading the image.",
      };
    }

    // save result to user's library
    const save = await tryCatch(
      saveImage(ctx, prompt, download.data, userId, threadId),
    );
    if (save.error) {
      console.error(save.error);
      return {
        success: false,
        value: "Ran into an issue while saving the image.",
      };
    }

    return {
      success: true,
      value: save.data,
    };
  },
});
