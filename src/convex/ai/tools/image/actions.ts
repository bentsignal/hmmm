"use node";

import crypto from "node:crypto";
import { utapi } from "@/server/uploadthing";
import { fal } from "@fal-ai/client";
import { UTFile } from "uploadthing/server";
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import {
  ImageGenerationModel,
  imageGenerationModels,
} from "@/convex/ai/models";
import { aspectRatioMap, vAspectRatio, type AspectRatio } from "./types";
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
    const result = await generateFalAIImage(
      prompt,
      aspectRatio,
      imageGenerationModels["imagen4-ultra"],
    );
    if (result.error) {
      return {
        success: false,
        value: result.error,
      };
    }
    if (!result.image) {
      return {
        success: false,
        value: "No image generated",
      };
    }

    // upload image to uploadthing
    let fileName = "";
    if (userId) {
      fileName += `${userId}-`;
    }
    if (threadId) {
      fileName += `${threadId}-`;
    }
    fileName += "generated-image.png";
    const file = new UTFile([result.image], fileName, { type: "image/png" });
    const uploadedFile = await utapi.uploadFiles(file);
    if (uploadedFile.error) {
      return {
        success: false,
        value: `Error uploading image to uploadthing: ${uploadedFile.error.message}`,
      };
    }

    // save file metadata to convex metadata table, as well as to image slot
    // in thread when appropriate.
    await ctx.runMutation(internal.app.library.uploadFileMetadataInternal, {
      file: {
        key: uploadedFile.data.key,
        name: fileName,
        type: "image/png",
        size: result.image.length,
      },
      userId: userId ?? "no-user",
    });

    return {
      success: true,
      value: uploadedFile.data.key,
    };
  },
});

const downloadImage = async (url: string) => {
  const download = await tryCatch(fetch(url));
  if (download.error) {
    return {
      image: null,
      error: `Error downloading image from Fal CDN: ${download.error.message}`,
    };
  }
  const conversion = await tryCatch(download.data.arrayBuffer());
  if (conversion.error) {
    return {
      image: null,
      error: `Error converting image to uint8Array: ${conversion.error.message}`,
    };
  }
  const uint8Array = new Uint8Array(conversion.data);

  return {
    image: uint8Array,
    error: null,
  };
};

const generateFalAIImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  model: ImageGenerationModel,
) => {
  const { data: result, error: generationError } = await tryCatch(
    fal.subscribe(model.model, {
      input: {
        prompt,
        num_images: 1,
        aspect_ratio: aspectRatioMap[aspectRatio],
      },
    }),
  );
  if (generationError) {
    return {
      image: null,
      error: `Error generating image with Fal AI: ${generationError.message}`,
    };
  }
  if (!result) {
    return {
      image: null,
      error: "No result from Fal AI",
    };
  }
  const image = await downloadImage(result.data.images[0].url);
  if (image.error) {
    return {
      image: null,
      error: image.error,
    };
  }
  return {
    image: image.image,
    error: null,
  };
};
