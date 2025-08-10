import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import { z } from "zod";
import { languageModels } from "../models";

export const fileAnalysis = createTool({
  description: `
    Used to analyze a file. Can be used to analyze images, PDFs, etc.
  `,
  args: z.object({
    key: z.string().describe("The R2 key of the file to analyze."),
    prompt: z.string().describe("The prompt to use to analyze the file."),
  }),
  handler: async (ctx, args, options) => {
    const result = await generateText({
      model: languageModels["gemini-2.5-flash"].model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: args.prompt,
            },
            {
              type: "image",
              image: `https://media-cldnry.s-nbcnews.com/image/upload/t_nbcnews-fp-1200-630,f_auto,q_auto:best/rockcms/2022-08/220805-border-collie-play-mn-1100-82d2f1.jpg`,
            },
          ],
        },
      ],
    });
    return result.text;
  },
});
