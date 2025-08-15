import { Agent } from "@convex-dev/agent";
import { components } from "@/convex/_generated/api";
import { languageModels } from "@/convex/agents/models";
import { agentPrompt } from "@/convex/agents/prompts";
import {
  currentEvents,
  dateTime,
  fileAnalysis,
  positionHolder,
  weather,
} from "./tools";

export const agent = new Agent(components.agent, {
  chat: languageModels["gemini-2.5-flash"].model,
  name: "QBE",
  instructions: agentPrompt,
  maxSteps: 20,
  maxRetries: 3,
  tools: {
    dateTime,
    currentEvents,
    weather,
    positionHolder,
    fileAnalysis,
  },
  contextOptions: {
    excludeToolMessages: false,
  },
});
