"use node";

import { createTool } from "@convex-dev/agent";
import { generateText, UserModelMessage } from "ai";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { getFileUrl, getPublicFile } from "@/convex/app/library";
import { calculateModelCost } from "@/convex/user/usage";
import { languageModels } from "../models";
import { getFileType } from "@/features/library/lib";
import { LibraryFile } from "@/features/library/types";

const inputSchema = z.object({
  fileNames: z.array(z.string().describe("names of the files to analyze.")),
  prompt: z.string().describe("The prompt to use to analyze the files."),
});
type FileAnalysisInput = z.infer<typeof inputSchema>;

type FileAnalysisOutput = {
  response: string;
  files: LibraryFile[];
};

export const fileAnalysis = createTool<FileAnalysisInput, FileAnalysisOutput>({
  description: `
    Used to analyze a file. Can be used to analyze images, documents, etc.
  `,
  args: inputSchema,
  handler: async (ctx, args): Promise<FileAnalysisOutput> => {
    const { fileNames, prompt } = args;

    if (!ctx.userId) {
      return {
        response: "User not authenticated",
        files: [],
      };
    }

    const files = await ctx.runQuery(internal.app.library.getFilesByName, {
      fileNames: fileNames,
      userId: ctx.userId,
    });

    const messages: UserModelMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          ...files.map((file) => {
            const fileType =
              getFileType(file.fileType) === "image" ? "image" : "file";
            const url = getFileUrl(file.key);
            return fileType === "image"
              ? {
                  type: "image" as const,
                  image: url,
                }
              : {
                  type: "file" as const,
                  data: url,
                  mediaType: file.fileType,
                };
          }),
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
        result.providerMetadata,
      );
      await ctx.runMutation(internal.user.usage.log, {
        userId: ctx.userId,
        type: "tool_call",
        cost: cost,
      });
    }

    return {
      response: result.text,
      files: files.map((file) => getPublicFile(file)),
    };
  },
});
