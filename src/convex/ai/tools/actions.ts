"use node";

import crypto from "node:crypto";
import { utapi } from "@/server/uploadthing";
import { fal } from "@fal-ai/client";
import { experimental_generateImage } from "ai";
import { UTFile } from "uploadthing/server";
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import { modelPresets } from "../models";
import { vImageGenType } from "./image_generation_tool";
import { tryCatch } from "@/lib/utils";

globalThis.crypto = crypto as unknown as Crypto;

type GenerateImageOutput = {
  error: string | null;
  success: boolean;
};

export const generateImage = internalAction({
  args: v.object({
    prompt: v.string(),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    requestType: vImageGenType,
    slot: v.optional(v.id("generatedImages")),
  }),
  handler: async (ctx, args): Promise<GenerateImageOutput> => {
    const { prompt, userId, threadId, requestType, slot } = args;

    // route request to appropriate image generation model
    const result =
      requestType === "Model A"
        ? await generateFalAIImage(prompt)
        : await generateOpenAIImage(prompt);
    if (result.error) {
      return {
        error: result.error,
        success: false,
      };
    }
    if (!result.image) {
      return {
        error: "No image generated",
        success: false,
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
        error: `Error uploading image to uploadthing: ${uploadedFile.error.message}`,
        success: false,
      };
    }

    // save file metadata to convex metadata table, as well as to image slot
    // in thread when appropriate.
    const fileId = await ctx.runMutation(
      internal.app.library.uploadFileMetadataInternal,
      {
        file: {
          key: uploadedFile.data.key,
          name: fileName,
          type: "image/png",
          size: result.image.length,
        },
        userId: userId ?? "no-user",
      },
    );
    if (slot) {
      await ctx.runMutation(internal.ai.thread.uploadImageToSlot, {
        slot,
        file: fileId,
      });
    }

    return {
      success: true,
      error: null,
    };
  },
});

const generateOpenAIImage = async (prompt: string) => {
  const image = await tryCatch(
    experimental_generateImage({
      model: modelPresets.imageGeneration.model,
      prompt,
    }),
  );
  if (image.error) {
    return {
      image: null,
      error: `Error generating image with OpenAI: ${image.error.message}`,
    };
  }
  return {
    image: image.data.image.uint8Array,
    error: null,
  };
};

const generateFalAIImage = async (prompt: string) => {
  const { data: result, error: generationError } = await tryCatch(
    fal.subscribe("fal-ai/flux-1/krea", {
      input: {
        prompt,
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

  // download image data from Fal CDN, later will be uploaded to uploadthing
  const download = await tryCatch(fetch(result.data.images[0].url));
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
