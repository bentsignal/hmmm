import { generateObject } from "ai";
import { Context, Effect, Layer } from "effect";
import z from "zod";

import type { ActionCtx } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { modelPresets } from "../../models/presets";
import { followUpGeneratorPrompt } from "../../prompts";
import { FollowUpGenerationError } from "../errors";

interface FollowUpsShape {
  readonly generate: (args: {
    threadId: string;
    responseText: PromiseLike<string>;
  }) => Effect.Effect<void, FollowUpGenerationError, never>;
}

export class FollowUps extends Context.Service<FollowUps, FollowUpsShape>()(
  "StreamResponse/FollowUps",
) {}

export function followUpsLayer(ctx: ActionCtx) {
  return Layer.succeed(FollowUps)({
    generate: ({ threadId, responseText }) =>
      Effect.tryPromise({
        try: async () => {
          const responseMessage = await responseText;
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
          await ctx.runMutation(internal.ai.thread.followUps.save, {
            threadId,
            followUpQuestions: followUpQuestions.questions,
          });
        },
        catch: (cause) => new FollowUpGenerationError({ cause }),
      }),
  });
}
