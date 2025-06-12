import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const agent = new Agent(components.agent, {
  chat: openRouter.chat("google/gemini-2.5-flash-preview-05-20"),
  instructions: `You are a helpful assistent. Given a prompt or thread of messages, deliver
  a response that will help answer the question or task being proposed by the user.
  Give a concise response, unless explicitly asked to give an extended response by the user. 
  Do not over explain your response, unless explicitly asked to do so by the user.`,
});
