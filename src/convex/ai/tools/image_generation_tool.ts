import { createTool } from "@convex-dev/agent";
import { generateObject } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { imageGenerationRouterPrompt } from "@/convex/ai/prompts";
import { languageModels } from "../models";

export const vImageGenType = v.union(
  v.literal("Model A"),
  v.literal("Model B"),
);
const zImageGenType = z.enum(["Model A", "Model B"]);

export const imageGeneration = createTool({
  description: `
  
  Generate an image or graphic. 
  
  ***IMPORTANT*** before calling this tool, you must call the imageGenerationInit 
  tool. You must do this **EACH TIME** you want to generate a new image. Previous 
  calls to the initialization tool will not be valid.

  `,
  args: z.object({
    prompt: z.string().describe("The prompt to use to generate the image."),
  }),
  handler: async (ctx, args): Promise<string> => {
    const { prompt } = args;

    if (!ctx.threadId) {
      throw new Error("Thread ID is required");
    }

    // get the most recent image slot for the thread, this will be used to
    // store the image after it is generated.
    const slot = await ctx.runQuery(internal.ai.thread.getMostRecentImageSlot, {
      threadId: ctx.threadId,
    });

    // determine which model will be used to generate the image. Model A
    // is better for artistic images, Model B is better for handling text
    // placement and other more complex details.
    const type = await generateObject({
      model: languageModels["gemini-2.0-flash"].model,
      schema: z.object({
        type: zImageGenType,
      }),
      system: imageGenerationRouterPrompt,
      prompt: prompt,
    });

    // jump to node runtime to generate the image.
    const result = await ctx.runAction(
      internal.ai.tools.actions.generateImage,
      {
        prompt,
        userId: ctx.userId,
        threadId: ctx.threadId,
        requestType: type.object.type,
        slot: slot._id,
      },
    );

    if (!result.success) {
      console.error(result.error);
      return "Error generating image";
    }

    return "Image generated successfully";
  },
});

type ImageGenInitResult = {
  slot: Doc<"generatedImages">["_id"];
};

export const imageGenerationInit = createTool<object, ImageGenInitResult>({
  description: `A tool to prepare for image generation. After this tool call has
  completed, use its results to call the imageGeneration tool.`,
  args: z.object({}),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args): Promise<ImageGenInitResult> => {
    const { userId, threadId } = ctx;

    // create an empty slot for the image to be placed in after is has been
    // generated, this will show as a skeleton until the image generation is
    // complete.
    const slot = await ctx.runMutation(internal.ai.thread.createImageSlot, {
      userId,
      threadId,
    });

    return {
      slot,
    };
  },
});
