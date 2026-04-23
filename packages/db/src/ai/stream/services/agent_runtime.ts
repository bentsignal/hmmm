import { Context, Effect, Layer } from "effect";

import type { ActionCtx } from "../../../_generated/server";
import type { Agent } from "../../../../lib/agent-client";
import { internal } from "../../../_generated/api";
import { getModel } from "../../models/helpers";
import { StreamConsumeError, StreamInitError } from "../errors";

export interface StreamTextHandle {
  readonly consumeStream: () => PromiseLike<void>;
  readonly text: PromiseLike<string>;
}

interface StreamArgs {
  readonly threadId: string;
  readonly promptMessageId: string;
  readonly generationId: string;
  readonly model: string | undefined;
  readonly controller: AbortController;
}

export class AgentRuntime extends Context.Service<
  AgentRuntime,
  {
    readonly streamText: (
      args: StreamArgs,
    ) => Effect.Effect<StreamTextHandle, StreamInitError, never>;
    readonly consumeStream: (
      handle: StreamTextHandle,
    ) => Effect.Effect<void, StreamConsumeError, never>;
  }
>()("StreamResponse/AgentRuntime") {}

// Fire-and-forget observability callback. Emits:
//   `agent_working`  — first chunk of any kind (reasoning, tool-call, source).
//   `response_streaming` — first text-delta chunk.
// Abort detection lives entirely in the scope-level `abortWatcher`; this
// callback is pure event emission.
function makeOnChunk(
  ctx: ActionCtx,
  args: { threadId: string; generationId: string },
) {
  const { threadId, generationId } = args;
  let agentWorkingEmitted = false;
  let responseStreamingEmitted = false;
  return async ({ chunk }: { chunk: { type: string } }) => {
    if (!agentWorkingEmitted) {
      agentWorkingEmitted = true;
      await ctx.runMutation(internal.ai.thread.events.emit, {
        threadId,
        eventType: "agent_working",
        generationId,
      });
    }
    if (responseStreamingEmitted) return;
    if (chunk.type !== "text-delta") return;
    responseStreamingEmitted = true;
    await ctx.runMutation(internal.ai.thread.events.emit, {
      threadId,
      eventType: "response_streaming",
      generationId,
    });
  };
}

export function agentRuntimeLayer(ctx: ActionCtx, agent: Agent) {
  return Layer.succeed(AgentRuntime)({
    streamText: ({
      threadId,
      promptMessageId,
      generationId,
      model,
      controller,
    }) =>
      Effect.gen(function* () {
        const resolvedModel = getModel(model);
        const { thread } = agent.continueThread(ctx, { threadId });
        const onChunk = makeOnChunk(ctx, { threadId, generationId });
        return yield* Effect.tryPromise({
          try: () =>
            thread.streamText(
              {
                model: resolvedModel.model,
                promptMessageId,
                maxOutputTokens: 64000,
                abortSignal: controller.signal,
                providerOptions: {
                  openrouter: { reasoning: { max_tokens: 32000 } },
                },
                onChunk,
              },
              { saveStreamDeltas: true },
            ),
          catch: (cause) =>
            new StreamInitError({ cause, model: model ?? "default" }),
        });
      }),
    consumeStream: (handle) =>
      Effect.tryPromise({
        try: async () => {
          await handle.consumeStream();
        },
        catch: (cause) => new StreamConsumeError({ cause }),
      }),
  });
}
