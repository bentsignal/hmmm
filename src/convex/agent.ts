import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { models } from "@/features/models/types/models";
import modelMap from "@/features/models/types/model-map";
import { search } from "./tools";

const defaultModel = modelMap.get(models[0].id);
if (!defaultModel) {
  throw new Error("Default model not found");
}

export const agent = new Agent(components.agent, {
  chat: defaultModel,
  instructions: `You are a helpful assistent. Given a prompt or thread of messages, deliver
  a response that will help answer the question or task being proposed by the user.
  
  Give a concise response, unless explicitly asked to give an extended response by the user. 
  Do not over explain your response, unless explicitly asked to do so by the user.
  
  When the user asks about current events, weather, recent news, stock prices, sports scores, 
  or any information that changes frequently or requires up-to-date data, you MUST use the 
  search tool to get the latest information. Do not rely on your training data for these 
  types of queries. If the question does not match these criteria, do not use the search tool.
  If the user asks about something that happened more than a year ago, do not use the search tool.
  
  For questions about weather, always search for current weather conditions in the specified location.
  For questions about news or current events, always search for the latest information.
  
  If the user asks for help writing or refactoring code, do not use the search tool under any circumstances. 
  For coding related questions, use your knowledge to provide them with the best answer possible.

  `,
  tools: {
    search,
  },
});
