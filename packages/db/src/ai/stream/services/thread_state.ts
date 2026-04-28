import { Context, Effect, Layer } from "effect";

import type { ActionCtx } from "../../../_generated/server";
import type { ErrorCode } from "../error_codes";
import { internal } from "../../../_generated/api";
import { logSystemError } from "../../thread/helpers";
import { ConvexCallError } from "../errors";

interface ThreadStateShape {
  readonly wasAborted: (args: {
    threadId: string;
    generationId: string;
  }) => Effect.Effect<boolean, ConvexCallError, never>;
  readonly writeSystemError: (args: {
    threadId: string;
    generationId: string;
    code: ErrorCode;
  }) => Effect.Effect<void, ConvexCallError, never>;
}

export class ThreadState extends Context.Service<
  ThreadState,
  ThreadStateShape
>()("StreamResponse/ThreadState") {}

export function threadStateLayer(ctx: ActionCtx) {
  return Layer.succeed(ThreadState)({
    wasAborted: ({ threadId, generationId }) =>
      Effect.tryPromise({
        try: () =>
          ctx.runQuery(internal.ai.thread.state.wasAborted, {
            threadId,
            generationId,
          }),
        catch: (cause) => new ConvexCallError({ cause, op: "wasAborted" }),
      }),
    writeSystemError: ({ threadId, generationId, code }) =>
      Effect.tryPromise({
        try: () =>
          logSystemError(ctx, threadId, {
            code,
            generationId,
            timestamp: Date.now(),
          }),
        catch: (cause) =>
          new ConvexCallError({ cause, op: "writeSystemError" }),
      }),
  });
}
