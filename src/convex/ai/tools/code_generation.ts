import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { calculateModelCost } from "@/convex/user/usage";
import { languageModels } from "../models";
import { codeGenerationPrompt } from "../prompts";
import { tryCatch } from "@/lib/utils";

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
  args: inputSchema,
  handler: async (ctx, args, options): Promise<CodeGenerationOutput> => {
    const messages = options.messages;

    const result = await tryCatch(
      generateText({
        system: codeGenerationPrompt,
        model: languageModels["gpt-5.1"].model,
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
        languageModels["gpt-5.1"],
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
