import { tool } from "ai";
import { z } from "zod";

import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    "HTTP-Referer": "https://www.qbe.sh",
    "X-Title": "QBE ",
  },
});

export const webSearch = tool({
  description: `Used to search the web for up-to-date information.`,
  parameters: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
  }),
  execute: async ({ query }) => {
    const result = await openai.chat.completions.create({
      model: "perplexity/sonar",
      messages: [{ role: "user", content: query }],
    });

    const text = result.choices[0].message.content ?? "";
    // @ts-expect-error any
    const sources = result.citations as string[];

    // add links to sources in response
    const processedText = text.replace(/\[(\d+)\]/g, (match, number) => {
      const sourceIndex = parseInt(number) - 1;
      if (
        sourceIndex >= 0 &&
        sourceIndex < sources.length &&
        sources[sourceIndex]
      ) {
        return ` [\\[${number}\\]](${sources[sourceIndex]})`;
      }
      return match;
    });

    return {
      text: processedText,
      sources,
    };
  },
});
