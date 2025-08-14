import { createTool } from "@convex-dev/agent";
import { CoreUserMessage, generateText } from "ai";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { getFileUrl } from "@/convex/library/library_helpers";
import { calculateModelCost } from "@/convex/sub/sub_helpers";
import { languageModels } from "../models";
import { getFileType } from "@/features/library/lib";

export const fileAnalysis = createTool({
  description: `
    Used to analyze a file. Can be used to analyze images, documents, etc.
  `,
  args: z.object({
    fileName: z.string().describe("file name of the file to analyze."),
    prompt: z.string().describe("The prompt to use to analyze the file."),
  }),
  handler: async (ctx, args): Promise<string> => {
    const { fileName, prompt } = args;

    if (!ctx.userId) {
      return "User not authenticated";
    }

    const file = await ctx.runQuery(
      internal.library.library_queries.getFileByName,
      {
        fileName: fileName,
        userId: ctx.userId,
      },
    );
    if (!file) {
      return "File not found";
    }

    const fileType = getFileType(file.fileType) === "image" ? "image" : "file";
    const url = getFileUrl(file.key);

    const messages: CoreUserMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          fileType === "image"
            ? {
                type: "image",
                image: url,
              }
            : {
                type: "file",
                data: url,
                mimeType: file.fileType,
              },
        ],
      },
    ];

    const result = await generateText({
      model: languageModels["gemini-2.5-flash"].model,
      messages: messages,
    });

    // log usage
    if (ctx.userId) {
      const cost = calculateModelCost(
        languageModels["gemini-2.5-flash"],
        result.usage,
      );
      await ctx.runMutation(internal.sub.usage.logToolCallUsage, {
        userId: ctx.userId,
        cost: cost,
      });
    }

    return result.text;
  },
});
