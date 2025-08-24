import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { zAspectRatio } from "./types";

type InitImageResult = {
  // slot: Doc<"generatedImages">["_id"];
  response: string;
};

const initWarning = `
***IMPORTANT*** before calling this tool, you must call the imageGenerationInit 
tool. You must do this **EACH TIME** you want to generate or edit a new image. Previous 
calls to the initialization tool will not be valid.
`;

export const initImage = createTool<object, InitImageResult>({
  description: `A tool to prepare for image generation or editing. After this tool 
  call has completed, you are free to call either the generateImage or editImage 
  tool. Each call to this tool is only valid for one image generation or editing
  request. After that, another request to this tool must be made.`,
  args: z.object({}),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args): Promise<InitImageResult> => {
    // TODO: Block if the user is not allowed to generate images
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
    was successful. If an error occurs, the key will be null. You do not need to include
    the key in your text response, the key is included for context and ui purposes.
    
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
