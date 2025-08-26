import { utapi } from "@/server/uploadthing";
import { fal } from "@fal-ai/client";
import { UTFile } from "uploadthing/server";
import { internal } from "@/convex/_generated/api";
import { ActionCtx } from "@/convex/_generated/server";
import { FalImageGenerationModel } from "@/convex/ai/models";
import { aspectRatioMap, type AspectRatio } from "./types";
import { tryCatch } from "@/lib/utils";

export const saveImage = async (
  ctx: ActionCtx,
  prompt: string,
  image: Uint8Array,
  userId?: string,
  threadId?: string,
) => {
  // public is for in user's library, private is for uploadthing
  const { publicFileName, privateFileName } = getFileNames(
    prompt,
    userId,
    threadId,
  );

  // upload image data to uploadthing
  const uploadedFile = await tryCatch(uploadImage(image, privateFileName));
  if (uploadedFile.error) {
    throw new Error(
      `Failed to upload image to uploadthing: ${uploadedFile.error.message}`,
    );
  }

  // save file metadata to convex metadata table, this will log usage for the user
  const { error: uploadFileMetadataError } = await tryCatch(
    ctx.runMutation(internal.app.library.uploadFileMetadataInternal, {
      file: {
        key: uploadedFile.data,
        name: publicFileName,
        type: "image/png",
        size: image.length,
      },
      userId: userId ?? "no-user",
    }),
  );
  if (uploadFileMetadataError) {
    throw new Error(
      `Failed to save file metadata to convex metadata table: ${uploadFileMetadataError.message}`,
    );
  }

  return uploadedFile.data;
};

const getFileNames = (prompt: string, userId?: string, threadId?: string) => {
  const publicFileName = prompt
    .replace(/[^a-zA-Z0-9]/g, "-")
    .trim()
    .toLowerCase()
    .slice(0, 100);
  let privateFileName = "";
  if (userId) {
    privateFileName += `${userId}-`;
  }
  if (threadId) {
    privateFileName += `${threadId}-`;
  }
  privateFileName += "generated-image.png";
  return {
    publicFileName,
    privateFileName,
  };
};

export const downloadImage = async (url: string) => {
  const download = await tryCatch(fetch(url));
  if (download.error) {
    throw new Error(`Error downloading image: ${download.error.message}`);
  }
  const conversion = await tryCatch(download.data.arrayBuffer());
  if (conversion.error) {
    throw new Error(
      `Error converting image to uint8Array: ${conversion.error.message}`,
    );
  }
  const uint8Array = new Uint8Array(conversion.data);

  return uint8Array;
};

export const uploadImage = async (image: Uint8Array, fileName: string) => {
  // upload image to uploadthing
  const buffer = new Uint8Array(
    image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength),
  );
  const blob = new Blob([buffer], { type: "image/png" });
  const file = new UTFile([blob], fileName, { type: "image/png" });
  const uploadedFile = await utapi.uploadFiles(file);
  if (uploadedFile.error) {
    throw new Error(
      `Error uploading image to uploadthing: ${uploadedFile.error.message}`,
    );
  }
  return uploadedFile.data.key;
};

export const generateImageFalAI = async (
  prompt: string,
  aspectRatio: AspectRatio,
  model: FalImageGenerationModel,
): Promise<string> => {
  if (model.type !== "text-to-image") {
    throw new Error("Model is not a text-to-image model");
  }
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
    throw new Error(
      `Error generating image with Fal AI: ${generationError.message}`,
    );
  }
  try {
    return result.data.images[0].url;
  } catch (error) {
    throw new Error(
      `Error retrieving result from Fal AI response, ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const editImageFalAI = async (
  prompt: string,
  urls: string[],
  model: FalImageGenerationModel,
): Promise<string> => {
  if (model.type !== "image-to-image") {
    throw new Error("Model is not a image-to-image model");
  }
  const { data: result, error: generationError } = await tryCatch(
    fal.subscribe(model.model, {
      input: {
        prompt,
        image_urls: urls,
      },
    }),
  );
  if (generationError) {
    throw new Error(
      `Error editing image with Fal AI: ${generationError.message}`,
    );
  }
  if (!result) {
    throw new Error("No result from Fal AI");
  }
  try {
    return result.data.images[0].url;
  } catch (error) {
    throw new Error(
      `Error retrieving result from Fal AI response, ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
