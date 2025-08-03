import { generateObject, generateText } from "ai";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import { languageModels } from "../models";
import { formatSuggestions, suggestionsGenerationPrompt } from "./prompts";

export const generateSuggestions = internalAction({
  args: {},
  handler: async (ctx) => {
    // generate text containing prompts
    const { text: rawPrompts } = await generateText({
      model: languageModels["sonar"].model,
      prompt: suggestionsGenerationPrompt,
    });
    // parse text into array of prompts
    const { object: prompts } = await generateObject({
      model: languageModels["gemini-2.0-flash"].model,
      prompt: rawPrompts,
      system: formatSuggestions,
      schema: z.object({
        prompts: z.array(z.string()).max(10),
      }),
    });
    // save new suggestions to table
    await ctx.runMutation(
      internal.agents.prompts.prompt_mutations.saveNewSuggestions,
      {
        prompts: prompts.prompts,
      },
    );
  },
});
