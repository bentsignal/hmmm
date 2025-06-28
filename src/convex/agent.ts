import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { systemPrompt } from "@/features/prompts";
import { defaultModel } from "@/features/models";

export const agent = new Agent(components.agent, {
  chat: defaultModel,
  instructions: systemPrompt,
  maxSteps: 10,
});
