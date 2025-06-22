import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { perplexity } from "@ai-sdk/perplexity";

export const webSearch = tool({
  description: `Used to search the web for up-to-date information.`,
  parameters: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
  }),
  execute: async ({ query }) => {
    const { text, sources } = await generateText({
      model: perplexity("sonar"),
      prompt: query,
    });

    // add links to sources in response
    const processedText = text.replace(/\[(\d+)\]/g, (match, number) => {
      const sourceIndex = parseInt(number) - 1;
      if (
        sourceIndex >= 0 &&
        sourceIndex < sources.length &&
        sources[sourceIndex]?.url
      ) {
        return ` [\\[${number}\\]](${sources[sourceIndex].url})`;
      }
      return match;
    });

    return {
      text: processedText,
      sources,
    };
  },
});
