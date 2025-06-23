import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { defaultModel } from "@/features/models/types/models";
import modelMap from "@/features/models/types/model-map";
import { intro, returnStyle } from "@/features/prompts/system-prompts";

const model = modelMap.get(defaultModel.id);
if (!model) {
  throw new Error("Default model not found");
}

export const agent = new Agent(components.agent, {
  chat: model,
  instructions: `${intro} ${returnStyle}`,
  maxSteps: 1,
});
