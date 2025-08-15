import { Agent } from "@convex-dev/agent";
import { components, internal } from "@/convex/_generated/api";
import { defaultModel } from "@/convex/agents/models/model_presets";
import { agentPrompt } from "@/convex/agents/prompts";
import { calculateModelCost } from "@/convex/sub/sub_helpers";
import {
  currentEvents,
  dateTime,
  fileAnalysis,
  positionHolder,
  weather,
} from "./tools";

export const agent = new Agent(components.agent, {
  chat: defaultModel.model,
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
  usageHandler: async (ctx, args) => {
    const cost = calculateModelCost(defaultModel, args.usage);
    await ctx.runMutation(internal.sub.usage.logUsage, {
      userId: args.userId || "no-user",
      type: "message",
      cost: cost,
    });
  },
});
