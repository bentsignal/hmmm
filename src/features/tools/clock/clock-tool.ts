import { tool } from "ai";
import { z } from "zod";

export const clock = tool({
  description: `Used to get the current date and time.`,
  parameters: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
  }),
  execute: async () => {
    const date = new Date();
    const time = date.toLocaleTimeString();
    return `The current date and time is ${date.toLocaleDateString()} and ${time}.`;
  },
});
