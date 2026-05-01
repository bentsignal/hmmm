import { Effect, Ref } from "effect";

type TimingField =
  | "initDurationMs"
  | "consumeDurationMs"
  | "followUpsDurationMs";

interface EventDraft {
  threadId: string;
  generationId: string;
  userId: string;
  userPlan: string | null;
  model: string;
  startedAt: number;
  initDurationMs: number | null;
  consumeDurationMs: number | null;
  followUpsDurationMs: number | null;
  outcome: "success" | "error" | "user_aborted" | "early_aborted";
  errorCode: string | null;
  errorTag: string | null;
  errorMessage: string | null;
  errorOp: string | null;
  followUpsAttempted: boolean;
  followUpsSucceeded: boolean;
  followUpsErrorMessage: string | null;
}

export type EventRef = Ref.Ref<EventDraft>;

export function makeEventRef(args: {
  threadId: string;
  generationId: string;
  userId: string;
  userPlan: string | null;
  model: string;
}) {
  return Ref.make<EventDraft>({
    ...args,
    startedAt: Date.now(),
    initDurationMs: null,
    consumeDurationMs: null,
    followUpsDurationMs: null,
    outcome: "success",
    errorCode: null,
    errorTag: null,
    errorMessage: null,
    errorOp: null,
    followUpsAttempted: false,
    followUpsSucceeded: false,
    followUpsErrorMessage: null,
  });
}

export function updateEvent(ref: EventRef, updates: Partial<EventDraft>) {
  return Ref.update(ref, (draft) => ({ ...draft, ...updates }));
}

export function timed<A, E, R>(
  ref: EventRef,
  key: TimingField,
  effect: Effect.Effect<A, E, R>,
) {
  return Effect.suspend(() => {
    const start = Date.now();
    return effect.pipe(
      Effect.ensuring(
        Ref.update(ref, (draft) => ({ ...draft, [key]: Date.now() - start })),
      ),
    );
  });
}

export function emitStreamEvent(ref: EventRef) {
  return Effect.gen(function* () {
    const draft = yield* Ref.get(ref);
    const totalDurationMs = Date.now() - draft.startedAt;
    const level =
      draft.outcome === "success" ? Effect.logInfo : Effect.logError;
    yield* level("stream.generation").pipe(
      Effect.annotateLogs({ ...draft, totalDurationMs }),
    );
  });
}
