import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { systemPrompt } from "@/features/prompts";
import { generalModel } from "@/features/models";

export const agent = new Agent(components.agent, {
  chat: generalModel,
  instructions: systemPrompt,
  maxSteps: 10,
});
