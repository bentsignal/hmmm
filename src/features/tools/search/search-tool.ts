import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { perplexity } from "@ai-sdk/perplexity";

export const search = tool({
  description: `Used to search the web for up-to-date information.`,
  parameters: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
  }),
  execute: async ({ query }) => {
    const { text, sources } = await generateText({
      model: perplexity("sonar"),
      prompt: query,
    });
    return {
      text,
      sources,
    };
  },
});
