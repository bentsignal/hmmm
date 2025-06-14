import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { models } from "@/features/models/types";
import modelMap from "@/features/models/types/model-map";

const defaultModel = modelMap.get(models[0].id);
if (!defaultModel) {
  throw new Error("Default model not found");
}

export const agent = new Agent(components.agent, {
  chat: defaultModel,
  instructions: `You are a helpful assistent. Given a prompt or thread of messages, deliver
  a response that will help answer the question or task being proposed by the user.
  Give a concise response, unless explicitly asked to give an extended response by the user. 
  Do not over explain your response, unless explicitly asked to do so by the user.`,
});
