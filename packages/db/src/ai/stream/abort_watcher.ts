import { Duration, Effect } from "effect";

import { UserAborted } from "./errors";
import { ThreadState } from "./services/thread_state";

const ABORT_POLL_INTERVAL_MS = 500;

// Polls `wasAborted` on an interval. When it returns true, aborts the shared
// controller (propagating to the upstream LLM call) and fails with
// `UserAborted` so `Effect.raceFirst` surfaces a typed error and the main
// work gets interrupted. Scope-level finalizers (e.g. clearForGeneration)
// still run on the interrupt path.
export function abortWatcher(args: {
  threadId: string;
  generationId: string;
  controller: AbortController;
}) {
  return Effect.gen(function* () {
    const threadState = yield* ThreadState;
    while (true) {
      yield* Effect.sleep(Duration.millis(ABORT_POLL_INTERVAL_MS));
      const aborted = yield* threadState.wasAborted({
        threadId: args.threadId,
        generationId: args.generationId,
      });
      if (aborted) {
        if (!args.controller.signal.aborted) args.controller.abort();
        return yield* new UserAborted();
      }
    }
  });
}
