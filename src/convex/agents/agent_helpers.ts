import { ActionCtx } from "../_generated/server";
import { agent } from "../agents/agent";

export const generateAgentResponse = async (
  ctx: ActionCtx,
  prompt: string,
  title?: string,
  userId?: string,
) => {
  const { threadId } = await agent.createThread(ctx, {
    title: title ?? "Response",
    userId,
  });
  const { thread } = await agent.continueThread(ctx, {
    threadId,
  });
  const result = await thread.generateText({
    prompt,
    maxTokens: 5000,
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 16000,
        },
      },
    },
  });
  return result.text;
};
