import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";

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

    const analysis = await tryCatch(
      ctx.runAction(internal.ai.tools.files.actions.analysis, {
        keys: keys,
        prompt: prompt,
        userId: ctx.userId,
      }),
    );

    if (analysis.error) {
      console.error(analysis.error);
      return {
        response: "Ran into an issue while analyzing the files",
      };
    }

    return {
      response: analysis.data,
    };
  },
});
