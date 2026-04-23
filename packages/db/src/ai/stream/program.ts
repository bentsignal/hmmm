import { Effect } from "effect";

import type { SystemErrorCode } from "../thread/helpers";
import type {
  ConvexCallError,
  StreamConsumeError,
  StreamInitError,
} from "./errors";
import { abortWatcher } from "./abort_watcher";
import { EarlyAborted, systemErrorCodeFor } from "./errors";
import { AgentRuntime } from "./services/agent_runtime";
import { FollowUps } from "./services/follow_ups";
import { ThreadEvents } from "./services/thread_events";
import { ThreadState } from "./services/thread_state";

export interface StreamResponseArgs {
  readonly threadId: string;
  readonly promptMessageId: string;
  readonly generationId: string;
  readonly model?: string | undefined;
}

// Writes a user-visible system error to the thread. Wrapped with
// `Effect.ignore({ log: true })` so a Convex failure here never masks the
// original cause of the program exiting.
function writeSystemError(args: {
  threadId: string;
  code: SystemErrorCode;
  message: string;
}) {
  return Effect.gen(function* () {
    const threadState = yield* ThreadState;
    yield* threadState.writeSystemError(args);
  }).pipe(Effect.ignore({ log: true }));
}

function handleStreamError(
  threadId: string,
  kind: "init" | "consume",
  e: StreamInitError | StreamConsumeError,
) {
  return Effect.gen(function* () {
    yield* Effect.logError(`stream-${kind} failed`, { cause: e.cause });
    yield* writeSystemError({
      threadId,
      code: systemErrorCodeFor(e),
      message:
        kind === "init"
          ? "Failed to initialize stream generation."
          : "Failed to stream response back to user.",
    });
  });
}

function handleConvexCallError(threadId: string, e: ConvexCallError) {
  return Effect.gen(function* () {
    yield* Effect.logError("convex-call failed", {
      cause: e.cause,
      op: e.op,
    });
    yield* writeSystemError({
      threadId,
      code: "G3" satisfies SystemErrorCode,
      message: "An unexpected error occurred.",
    });
  });
}

function handleDefect(threadId: string, cause: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logError("stream-response defect", { cause });
    yield* writeSystemError({
      threadId,
      code: "G3" satisfies SystemErrorCode,
      message: "An unexpected error occurred.",
    });
  });
}

function makeScoped(args: StreamResponseArgs) {
  const { threadId, promptMessageId, generationId, model } = args;
  return Effect.scoped(
    Effect.gen(function* () {
      const threadState = yield* ThreadState;
      const threadEvents = yield* ThreadEvents;
      const agentRuntime = yield* AgentRuntime;
      const followUps = yield* FollowUps;

      // If abort committed before the scheduler picked us up, bail before
      // we hit the LLM so no response is produced.
      const abortedEarly = yield* threadState.wasAborted({
        threadId,
        generationId,
      });
      if (abortedEarly) return yield* new EarlyAborted();

      // Always clear threadEvents for this generation on any exit path.
      yield* threadEvents.scopedGeneration(generationId);

      // Controller is owned by this scope so both the stream work and the
      // watcher coordinate through it; release aborts the signal if needed.
      const controller = yield* Effect.acquireRelease(
        Effect.sync(() => new AbortController()),
        (c) =>
          Effect.sync(() => {
            if (!c.signal.aborted) c.abort();
          }),
      );

      const mainWork = Effect.gen(function* () {
        const handle = yield* agentRuntime
          .streamText({
            threadId,
            promptMessageId,
            generationId,
            model,
            controller,
          })
          .pipe(Effect.withSpan("stream.init"));
        yield* agentRuntime
          .consumeStream(handle)
          .pipe(Effect.withSpan("stream.consume"));
        yield* followUps.generate({ threadId, responseText: handle.text }).pipe(
          Effect.withSpan("stream.followups"),
          Effect.catchTag("FollowUpGenerationError", (e) =>
            Effect.logWarning("follow-ups failed", { cause: e.cause }),
          ),
        );
      });

      // Watcher wins → UserAborted fails the race, mainWork is interrupted,
      // scope finalizers run. mainWork wins → watcher is interrupted.
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
  const { threadId, generationId, model } = args;
  return makeScoped(args).pipe(
    Effect.withSpan("stream.generation", {
      attributes: { threadId, generationId, model: model ?? "default" },
    }),
    Effect.annotateLogs({ threadId, generationId, model: model ?? "default" }),
    Effect.catchTag("StreamInitError", (e) =>
      handleStreamError(threadId, "init", e),
    ),
    Effect.catchTag("StreamConsumeError", (e) =>
      handleStreamError(threadId, "consume", e),
    ),
    Effect.catchTag("ConvexCallError", (e) =>
      handleConvexCallError(threadId, e),
    ),
    Effect.catchTag("UserAborted", () => Effect.logInfo("user-abort")),
    Effect.catchTag("EarlyAborted", () => Effect.logDebug("early-abort")),
    // Anything unhandled here is a defect (or a tagged error we forgot to
    // catch). Log the cause and surface a generic system error so the UI
    // never silently reports success on a real bug.
    Effect.catchCause((cause) => handleDefect(threadId, cause)),
  );
}
