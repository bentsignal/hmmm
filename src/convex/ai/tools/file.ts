"use node";

import { createTool } from "@convex-dev/agent";
import { generateText, UserModelMessage } from "ai";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { getFileUrl } from "@/convex/app/library";
import { calculateModelCost } from "@/convex/user/usage";
import { languageModels } from "../models";
import { getFileType } from "@/features/library/lib";

const inputSchema = z.object({
  keys: z.array(z.string().describe("keys of the files to analyze.")),
  prompt: z.string().describe("The prompt to use to analyze the files."),
});
type FileAnalysisInput = z.infer<typeof inputSchema>;

type FileAnalysisOutput = {
  response: string;
};

export const analyzeFiles = createTool<FileAnalysisInput, FileAnalysisOutput>({
  description: `
  
  A tool that can take in multiple files and perform analysis on them. You provide
  the file keys that you want to analyze, and the tool will retrieve them from the 
  user's library. It can be used to get summaries, compare contents, or any 
  other form of analysis you require.

  **IMPORTANT**: Do not include the file key in your text response to the user. The
  keys are included for context, not to be shown to the user.
  
  `,
  args: inputSchema,
  handler: async (ctx, args): Promise<FileAnalysisOutput> => {
    const { keys, prompt } = args;

    if (!ctx.userId) {
      return {
        response: "User not authenticated",
      };
    }

    const files = await ctx.runQuery(internal.app.library.getFilesByKeys, {
      keys: keys,
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
              getFileType(file.mimeType) === "image" ? "image" : "file";
            const url = getFileUrl(file.key);
            return fileType === "image"
              ? {
                  type: "image" as const,
                  image: url,
                }
              : {
                  type: "file" as const,
                  data: url,
                  mediaType: file.mimeType,
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
    };
  },
});
