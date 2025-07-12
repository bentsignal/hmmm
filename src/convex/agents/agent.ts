import { Agent } from "@convex-dev/agent";
import { components } from "@/convex/_generated/api";
import { defaultModel } from "@/convex/agents/models";
import { systemPrompt } from "@/convex/agents/prompts";

export const agent = new Agent(components.agent, {
  chat: defaultModel.model,
  name: "QBE",
  instructions: systemPrompt,
  maxSteps: 10,
});
