import { Effect } from "effect";

import type {
  ConvexCallError,
  StreamConsumeError,
  StreamInitError,
} from "./errors";
import type { EventRef } from "./stream_event";
import { abortWatcher } from "./abort_watcher";
import { ErrorCode } from "./error_codes";
import { EarlyAborted, errorCodeFor } from "./errors";
import { AgentRuntime } from "./services/agent_runtime";
import { FollowUps } from "./services/follow_ups";
import { ThreadEvents } from "./services/thread_events";
import { ThreadState } from "./services/thread_state";
import {
  emitStreamEvent,
  makeEventRef,
  timed,
  updateEvent,
} from "./stream_event";

export interface StreamResponseArgs {
  readonly threadId: string;
  readonly promptMessageId: string;
  readonly generationId: string;
  readonly model?: string | undefined;
  readonly userId: string;
  readonly userPlan?: string | undefined;
}

function writeSystemError(args: {
  threadId: string;
  generationId: string;
  code: ErrorCode;
}) {
  return Effect.gen(function* () {
    const threadState = yield* ThreadState;
    yield* threadState.writeSystemError(args);
  }).pipe(Effect.ignore({ log: true }));
}

function causeMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return String(cause);
}

function handleStreamError(
  ref: EventRef,
  threadId: string,
  generationId: string,
  e: StreamInitError | StreamConsumeError,
) {
  return Effect.gen(function* () {
    const code = errorCodeFor(e);
    yield* Effect.annotateCurrentSpan("error.code", code);
    yield* updateEvent(ref, {
      outcome: "error",
      errorCode: code,
      errorTag: e._tag,
      errorMessage: causeMessage(e.cause),
    });
    yield* writeSystemError({ threadId, generationId, code });
  });
}

function handleConvexCallError(
  ref: EventRef,
  threadId: string,
  generationId: string,
  e: ConvexCallError,
) {
  return Effect.gen(function* () {
    const code = errorCodeFor(e);
    yield* Effect.annotateCurrentSpan("error.code", code);
    yield* updateEvent(ref, {
      outcome: "error",
      errorCode: code,
      errorTag: e._tag,
      errorMessage: causeMessage(e.cause),
      errorOp: e.op,
    });
    yield* writeSystemError({ threadId, generationId, code });
  });
}

function handleDefect(
  ref: EventRef,
  threadId: string,
  generationId: string,
  cause: unknown,
) {
  return Effect.gen(function* () {
    const code = ErrorCode.InternalDefect;
    yield* Effect.annotateCurrentSpan("error.code", code);
    yield* updateEvent(ref, {
      outcome: "error",
      errorCode: code,
      errorTag: "Defect",
      errorMessage: causeMessage(cause),
    });
    yield* writeSystemError({ threadId, generationId, code });
  });
}

function makeScoped(args: StreamResponseArgs, ref: EventRef) {
  const { threadId, promptMessageId, generationId, model } = args;
  return Effect.scoped(
    Effect.gen(function* () {
      const threadState = yield* ThreadState;
      const threadEvents = yield* ThreadEvents;
      const agentRuntime = yield* AgentRuntime;
      const followUps = yield* FollowUps;

      const abortedEarly = yield* threadState.wasAborted({
        threadId,
        generationId,
      });
      if (abortedEarly) return yield* new EarlyAborted();

      yield* threadEvents.scopedGeneration(generationId);

      const controller = yield* Effect.acquireRelease(
        Effect.sync(() => new AbortController()),
        (c) =>
          Effect.sync(() => {
            if (!c.signal.aborted) c.abort();
          }),
      );

      const mainWork = Effect.gen(function* () {
        const handle = yield* timed(
          ref,
          "initDurationMs",
          agentRuntime
            .streamText({
              threadId,
              promptMessageId,
              generationId,
              model,
              controller,
            })
            .pipe(Effect.withSpan("stream.init")),
        );

        yield* timed(
          ref,
          "consumeDurationMs",
          agentRuntime
            .consumeStream(handle)
            .pipe(Effect.withSpan("stream.consume")),
        );

        yield* timed(
          ref,
          "followUpsDurationMs",
          Effect.gen(function* () {
            yield* updateEvent(ref, { followUpsAttempted: true });
            yield* followUps.generate({ threadId, responseText: handle.text });
            yield* updateEvent(ref, { followUpsSucceeded: true });
          }).pipe(
            Effect.withSpan("stream.followups"),
            Effect.catchTag("FollowUpGenerationError", (e) =>
              updateEvent(ref, {
                followUpsErrorMessage: causeMessage(e.cause),
              }),
            ),
          ),
        );
      });

      yield* Effect.raceFirst(
        mainWork,
        abortWatcher({
          threadId,
          generationId,
          controller,
        }),
      );
    }),
  );
}

export function makeProgram(args: StreamResponseArgs) {
  const { threadId, generationId, model, userId, userPlan } = args;
  const resolvedModel = model ?? "default";

  return Effect.gen(function* () {
    const ref = yield* makeEventRef({
      threadId,
      generationId,
      userId,
      userPlan: userPlan ?? null,
      model: resolvedModel,
    });

    yield* makeScoped(args, ref).pipe(
      Effect.catchTag("StreamInitError", (e) =>
        handleStreamError(ref, threadId, generationId, e),
      ),
      Effect.catchTag("StreamConsumeError", (e) =>
        handleStreamError(ref, threadId, generationId, e),
      ),
      Effect.catchTag("ConvexCallError", (e) =>
        handleConvexCallError(ref, threadId, generationId, e),
      ),
      Effect.catchTag("UserAborted", () =>
        updateEvent(ref, { outcome: "user_aborted" }),
      ),
      Effect.catchTag("EarlyAborted", () =>
        updateEvent(ref, { outcome: "early_aborted" }),
      ),
      Effect.catchCause((cause) =>
        handleDefect(ref, threadId, generationId, cause),
      ),
      Effect.ensuring(emitStreamEvent(ref)),
    );
  }).pipe(
    Effect.withSpan("stream.generation", {
      attributes: { threadId, generationId, model: resolvedModel },
    }),
    Effect.annotateLogs({
      threadId,
      generationId,
      userId,
      model: resolvedModel,
    }),
  );
}
