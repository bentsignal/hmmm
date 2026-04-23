import type { Scope } from "effect";
import { Context, Effect, Layer } from "effect";

import type { ActionCtx } from "../../../_generated/server";
import type { EventType } from "../../../agent/validators";
import { internal } from "../../../_generated/api";
import { ConvexCallError } from "../errors";

interface ThreadEventsShape {
  readonly emit: (args: {
    threadId: string;
    generationId: string;
    eventType: EventType;
  }) => Effect.Effect<void, ConvexCallError, never>;
  readonly clearForGeneration: (
    generationId: string,
  ) => Effect.Effect<void, ConvexCallError>;
  // Registers a finalizer on the current scope that clears all events for
  // this generation on any exit (success, failure, interrupt). Call once
  // per generation; callers do not need to clean up manually. Any Convex
  // failure inside the finalizer is logged but swallowed so it never masks
  // the original cause of the scope closing.
  readonly scopedGeneration: (
    generationId: string,
  ) => Effect.Effect<void, never, Scope.Scope>;
}

export class ThreadEvents extends Context.Service<
  ThreadEvents,
  ThreadEventsShape
>()("StreamResponse/ThreadEvents") {}

export function threadEventsLayer(ctx: ActionCtx) {
  function clearForGeneration(generationId: string) {
    return Effect.tryPromise({
      try: () =>
        ctx.runMutation(internal.ai.thread.events.clearForGeneration, {
          generationId,
        }),
      catch: (cause) =>
        new ConvexCallError({ cause, op: "events.clearForGeneration" }),
    });
  }
  return Layer.succeed(ThreadEvents)({
    emit: ({ threadId, generationId, eventType }) =>
      Effect.tryPromise({
        try: () =>
          ctx.runMutation(internal.ai.thread.events.emit, {
            threadId,
            generationId,
            eventType,
          }),
        catch: (cause) => new ConvexCallError({ cause, op: "events.emit" }),
      }),
    clearForGeneration,
    scopedGeneration: (generationId) =>
      Effect.addFinalizer(() =>
        clearForGeneration(generationId).pipe(Effect.ignore({ log: true })),
      ),
  });
}
