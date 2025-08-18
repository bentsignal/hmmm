import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import { z } from "zod";
import { languageModels } from "../models";
import { codeGenerationPrompt } from "../prompts";
import { tryCatch } from "@/lib/utils";

export const codeGeneration = createTool({
  description: `
    Used to generate code for difficult problems. Should not be used for
    simple requests that require basic code.
    
    No input is requried, as the tool can see all of the messages in the 
    thread. The tool will return the code generated as well as any other 
    relevant information, you are then responsible for displaying this 
    information to the user.
  `,
  args: z.object({}),
  handler: async (ctx, args, options) => {
    const messages = options.messages;

    // try to generate code with GPT-5 directly through openai
    const { data, error } = await tryCatch(
      generateText({
        system: codeGenerationPrompt,
        model: languageModels["gpt-5"].model,
        messages: messages,
        temperature: 1,
      }),
    );
    if (!error) {
      return data.text;
    }

    // might have hit rate limits with openai, fallback to o4 through openrouter
    console.error(
      "Error generating code with GPT-5, falling back to o4-mini through openrouter. Error: ",
      error,
    );
    const result = await generateText({
      system: codeGenerationPrompt,
      model: languageModels["o4-mini"].model,
      messages: messages,
    });
    return result.text;
  },
});
