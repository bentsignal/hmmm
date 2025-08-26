import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { zAspectRatio } from "./types";

type InitImageResult = {
  response: string;
};

const initWarning = `
***IMPORTANT*** before calling this tool, you must call the imageGenerationInit 
tool. You must do this **EACH TIME** you want to generate or edit a new image. Previous 
calls to the initialization tool will not be valid.
`;

const keyWarning = `  
**IMPORTANT**: Do not include the file key in your text response to the user. The
keys are included for context, not to be shown to the user.
`;

export const initImage = createTool<object, InitImageResult>({
  description: `A tool to prepare for image generation or editing. After this tool 
  call has completed, you are free to call either the generateImage or editImage 
  tool. Each call to this tool is only valid for one image generation or editing
  request. After that, another request to this tool must be made.`,
  args: z.object({}),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args): Promise<InitImageResult> => {
    // TODO: remove once streaming tool call results is implemented
    return {
      response:
        "All set, you can now call the generateImage or editImage tool.",
    };
  },
});

const zGenerateImage = z.object({
  prompt: z.string().describe("The prompt to use to generate the image."),
  aspectRatio: zAspectRatio,
});
type tGenerateImage = z.infer<typeof zGenerateImage>;

type GenerateImageResult = {
  key: string | null;
};

export const generateImage = createTool<tGenerateImage, GenerateImageResult>({
  description: `
    
    Generate an image or graphic. Will return the key of the image file if generation 
    was successful. If an error occurs, the key will be null. 

    ${keyWarning}

    ${initWarning}
    
    `,
  args: zGenerateImage,
  handler: async (ctx, args): Promise<GenerateImageResult> => {
    const { prompt, aspectRatio } = args;

    if (!ctx.threadId || !ctx.userId) {
      throw new Error("Thread ID is required");
    }

    // jump to node runtime to generate the image.
    const result = await ctx.runAction(
      internal.ai.tools.image.actions.generate,
      {
        prompt,
        userId: ctx.userId,
        threadId: ctx.threadId,
        aspectRatio,
      },
    );

    if (!result.success) {
      console.error(result.value);
      return {
        key: null,
      };
    }

    return {
      key: result.value,
    };
  },
});

const zEditImage = z.object({
  prompt: z.string().describe("The prompt to use to edit the images."),
  imageKeys: z.array(z.string()).describe("The keys of the images to edit."),
});
type tEditImage = z.infer<typeof zEditImage>;

export const editImage = createTool<tEditImage, GenerateImageResult>({
  description: `
  
    A tool for creating new images from existing ones. It accepts an array 
    of image keys and a prompt. It will use these images and the prompt to 
    create a new image. This new image will be saved to the user's library,
    and the storage key will be returned

    ${keyWarning}

    ${initWarning}
    
  `,
  args: zEditImage,
  handler: async (ctx, args): Promise<GenerateImageResult> => {
    const { prompt, imageKeys } = args;

    if (!ctx.threadId || !ctx.userId) {
      throw new Error("Thread ID is required");
    }

    const files = await ctx.runQuery(internal.app.library.getFilesByKeys, {
      keys: imageKeys,
      userId: ctx.userId,
    });
    if (!files) {
      throw new Error("Images not found");
    }

    // jump to node runtime to edit the image.
    const result = await ctx.runAction(internal.ai.tools.image.actions.edit, {
      prompt,
      urls: files.map((file) => file.url),
      userId: ctx.userId,
      threadId: ctx.threadId,
    });

    if (!result.success) {
      console.error(result.value);
      return {
        key: null,
      };
    }

    return {
      key: result.value,
    };
  },
});
