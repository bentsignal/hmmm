import { Agent } from "@convex-dev/agent";
import { generateObject } from "ai";
import z from "zod";
import { v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import { agentPrompt, followUpGeneratorPrompt } from "@/convex/ai/prompts";
import { ActionCtx, internalAction } from "../_generated/server";
import { calculateModelCost } from "../user/usage";
import { getModel, modelPresets } from "./models";
import { logSystemError } from "./thread";
import { tools } from "./tools";
import { tryCatch } from "@/lib/utils";

export const agent = new Agent(components.agent, {
  languageModel: modelPresets.default.model,
  name: "The Thinker",
  instructions: agentPrompt,
  maxSteps: 20,
  tools: tools,
  contextOptions: {
    excludeToolMessages: false,
  },
  callSettings: { maxRetries: 3, temperature: 1.0 },
  usageHandler: async (ctx, args) => {
    const cost = calculateModelCost(args.usage, args.providerMetadata);
    await ctx.runMutation(internal.user.usage.log, {
      userId: args.userId || "no-user",
      type: "message",
      cost: cost,
    });
  },
});

export const generateResponse = async (
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
    maxOutputTokens: 16000,
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 8000,
        },
      },
    },
  });
  return result.text;
};

export const streamResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId } = args;
    const { thread } = await agent.continueThread(ctx, {
      threadId: threadId,
    });
    const model = getModel(args.model);
    // initiate response
    const { data: result, error: streamInitError } = await tryCatch(
      thread.streamText(
        {
          model: model.model,
          promptMessageId,
          maxOutputTokens: 64000,
          providerOptions: {
            openrouter: {
              reasoning: {
                max_tokens: 32000,
              },
            },
          },
        },
        { saveStreamDeltas: true },
      ),
    );
    if (streamInitError) {
      logSystemError(
        ctx,
        threadId,
        "G1",
        "Failed to initialize stream generation.",
      );
      await ctx.runMutation(internal.ai.thread.setState, {
        threadId: threadId,
        state: "idle",
      });
      return;
    }
    // stream response back to user
    const { error: streamError } = await tryCatch(
      Promise.all([
        ctx.runMutation(internal.ai.thread.setState, {
          threadId: threadId,
          state: "streaming",
        }),
        result.consumeStream(),
      ]),
    );
    if (streamError) {
      logSystemError(
        ctx,
        threadId,
        "G2",
        "Failed to stream response back to user.",
      );
    }
    // stream has completed
    await Promise.allSettled([
      // set thread back to idle
      ctx.runMutation(internal.ai.thread.setState, {
        threadId: threadId,
        state: "idle",
      }),
      // generate follow up questions
      (async () => {
        const responseMessage = await result.text;
        const { object: followUpQuestions } = await generateObject({
          model: modelPresets.followUp.model,
          prompt: responseMessage,
          system: followUpGeneratorPrompt,
          schema: z.object({
            questions: z.array(z.string().max(300)).max(3),
          }),
          maxOutputTokens: 1000,
          maxRetries: 3,
        });
        await ctx.runMutation(internal.ai.thread.saveFollowUpQuestions, {
          threadId: threadId,
          followUpQuestions: followUpQuestions.questions,
        });
      })(),
    ]);
  },
});
