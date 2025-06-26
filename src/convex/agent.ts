import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { systemPrompt } from "./prompts";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const agent = new Agent(components.agent, {
  chat: openRouter.chat("google/gemini-2.0-flash-001"),
  instructions: systemPrompt,
  maxSteps: 10,
});
