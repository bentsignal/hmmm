import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { defaultModel } from "@/features/models/types/models";
import modelMap from "@/features/models/types/model-map";

const model = modelMap.get(defaultModel.id);
if (!model) {
  throw new Error("Default model not found");
}

export const agent = new Agent(components.agent, {
  chat: model,
  instructions: `You are a helpful assistent. Given a prompt or thread of messages, deliver
  a response that will help answer the question or task being proposed by the user.

  If the user asks about current events, current or upcoming weather, recent news, stock prices, sports scores,
  or any information that changes frequently or requires up-to-date data, use the search tool when available to get the latest
  information.

  Give a concise response, unless explicitly asked to give an extended response by the user. 
  Do not over explain your response, unless explicitly asked to do so by the user.
  `,
});
