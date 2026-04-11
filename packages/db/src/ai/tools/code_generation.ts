import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import { z } from "zod";

import { internal } from "../../_generated/api";
import { tryCatch } from "../../lib/utils";
import { calculateModelCost } from "../../user/usage";
import { modelPresets } from "../models";
import { codeGenerationPrompt } from "../prompts";

const inputSchema = z.object({});
type CodeGenerationInput = z.infer<typeof inputSchema>;

type CodeGenerationOutput = {
  code: string;
  reasoning?: string;
};

export const codeGeneration = createTool<
  CodeGenerationInput,
  CodeGenerationOutput
>({
  description: `
    Used to generate code for difficult problems. Should not be used for
    simple requests that require basic code.
    
    No input is requried, as the tool can see all of the messages in the 
    thread. The tool will return the code generated as well as any other 
    relevant information, you are then responsible for displaying this 
    information to the user.
  `,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: inputSchema as any,
  handler: async (ctx, args, options): Promise<CodeGenerationOutput> => {
    const messages = options.messages;

    const result = await tryCatch(
      generateText({
        system: codeGenerationPrompt,
        model: modelPresets.code.model,
        messages: messages,
        temperature: 1,
      }),
    );

    if (result.error) {
      console.error(result.error);
      return {
        code: "Ran into an error generating code. Please try again.",
      };
    }

    // log usage
    if (ctx.userId) {
      const cost = calculateModelCost(
        modelPresets.code,
        result.data.usage,
        result.data.providerMetadata,
      );
      await ctx.runMutation(internal.user.usage.log, {
        userId: ctx.userId,
        type: "tool_call",
        cost,
      });
    }

    return {
      code: result.data.text,
      reasoning: result.data.reasoningText,
    };
  },
});
