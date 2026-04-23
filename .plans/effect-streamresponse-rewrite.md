# Plan — Rewrite `streamResponse` with Effect v4 beta

**Status**: Research complete. Not started. Ready to hand off.
**Owner**: Next agent picking this up.
**Scope boundary**: ONLY `packages/db/src/ai/agents.ts` → `streamResponse` action. Do not touch `DeltaStreamer`, the Convex Agent component, the AI SDK integration, or any client code.

---

## 0. Why we're doing this

The `streamResponse` internal action is the central path of the app — prompt → LLM → streamed assistant message. The current implementation (see `packages/db/src/ai/agents.ts:152-243`) has accumulated pain:

1. **Duplicated cleanup across error paths.** `clearForGeneration` runs in three arms; stream/message finalization can be initiated by `awaitStreamCompletion` (stream_text.ts), `onError` (stream_text.ts), or `agentGenerateText`'s catch (generation.ts). It's unclear which wins.
2. **`wasAborted` is queried 4+ times per generation** (early gate, 500ms poll inside `onChunk`, after init error, after consume error, before follow-ups) and every branch has to reconcile it.
3. **`generateFollowUps` runs even if `streamError` occurred** — the `if (!aborted)` guard doesn't distinguish "succeeded" from "errored but not aborted". Bug.
4. **No single log per generation.** Errors surface via `console.log` in `logSystemError` with opaque codes `G1`/`G2`. No correlation, no timing, no structured attributes.
5. **Fire-and-forget cleanup** in `DeltaStreamer.#handleExternalAbort` (uses `void`) can silently leave `streamingMessages` rows stuck in `"streaming"` state.

### Primary goal: observability

One Effect span per generation, enriched as we proceed. Tagged errors mapped to stable user-facing messages. `console.log` sidechannel deleted. `G1/G2` system codes deleted.

### Non-goals (explicitly out of scope this pass)

- Rewriting `DeltaStreamer` (class stays; we wrap it as an Effect service).
- Moving the client to Effect.
- Replacing the Vercel AI SDK with `@effect/ai` (evaluated — see §7 — **rejected for this pass**).
- Making other actions in `packages/db/src/ai/**` use Effect.

---

## 1. Research summary

### Effect v4 beta — confirmed facts

Source: [Effect 4.0 beta blog](https://effect.website/blog/releases/effect/40-beta/) and [migration guide](https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md) with sub-docs under `migration/*.md`.

- Install: `pnpm add effect@beta`. Current dist-tag version at research time: `4.0.0-beta.X`. Pin an exact version at implementation time.
- All ecosystem packages share the `4.0.0-beta.X` version now (e.g. `@effect/opentelemetry@4.0.0-beta.X`). In v3 they were independently versioned.
- Bundle: "minimal program using Effect + Stream + Schema drops from ~70 kB (v3) to ~20 kB (v4)". Confirms the "keep Effect server-side" decision is cheap.
- `effect/unstable/*` is a namespace for evolving APIs. Avoid for now unless necessary.
- The blog states: "If you're running Effect in production, v3 remains our recommended choice for now." We accept the beta risk because this is server-only and we can pin.

### Confirmed v4 API differences from v3

| Area | v3 | v4 |
|------|----|----|
| Service class | `class X extends Context.Tag("X")<X, Shape>() {}` | `class X extends Context.Service<X, Shape>()("X") {}` |
| Tag constructor | `Context.GenericTag<X>("X")` | `Context.Service<X>("X")` |
| Service with `make` | `Effect.Service(...)({ effect, dependencies })` | `Context.Service(...)("id", { make })` + explicit `Layer.effect(this, this.make).pipe(Layer.provide(...))` |
| Runtime<R> | `Runtime<R>` existed | **Removed.** Use `Context<R>` + `Effect.runForkWith(services)` |
| Error handling | `Effect.catchAll` | `Effect.catch` |
| | `Effect.catchAllCause` | `Effect.catchCause` |
| | `Effect.catchSome` | `Effect.catchFilter` (uses `Filter` module) |
| | `catchTag` / `catchTags` / `catchIf` | **Unchanged** |
| | (new) | `Effect.catchReason`, `Effect.catchReasons`, `Effect.catchEager` |
| | `Effect.catchSomeDefect` | **Removed** |
| FiberRef | `FiberRef<A>` | `Context.Reference<A>` |
| Forking | Various `fork*` | "Renamed Combinators and New Options" — verify exact names at impl time |
| Core | `Effect`, `Layer`, `Schema`, `Stream` | Programming model same |

### APIs we need — assumed unchanged from v3 semantics (verify at impl)

- `Effect.gen(function* () { ... })`
- `Effect.tryPromise({ try: () => promise, catch: e => new TaggedError(...) })`
- `Effect.async<A, E, R>((resume, signal) => {...})` — signal is an `AbortSignal` tied to the fiber
- `Effect.runPromise(effect, { signal })` — accepts `AbortSignal` for external cancellation
- `Effect.runPromiseExit(effect, { signal })` — returns `Exit<A, E>`
- `Effect.fork`, `Effect.interrupt`, `Fiber.interrupt`
- `Effect.acquireRelease(acquire, release)` inside an `Effect.scoped` block
- `Effect.addFinalizer((exit) => ...)` inside an `Effect.scoped` block
- `Effect.ensuring(cleanup)` — runs on success/failure/interrupt
- `Effect.onInterrupt((fibers) => ...)` — only on interrupt
- `Effect.withSpan("name", { attributes })` / `Effect.annotateCurrentSpan(k, v)`
- `Effect.log*` levels, `Effect.annotateLogs`, `Effect.withLogSpan`
- `Data.TaggedError("Name")<{...}>` for error classes

### `@effect/ai` — evaluated, rejected for this pass

`@effect/ai` exists in the v4 ecosystem with provider packages `@effect/ai-anthropic`, `@effect/ai-openai`, `@effect/ai-openrouter`, `@effect/ai-openai-compat`. `AiLanguageModel.streamText(options): Stream.Stream<...>` with tool-call support. It's attractive but **does not fit this refactor**:

- Our current streaming is driven by the **Convex Agent component** (`@convex-dev/agent`) via `thread.streamText(...)`. The Agent does context assembly, persistence of messages, pending-ref lifecycle, step-finish save coordination, and delta persistence (`saveStreamDeltas`). `@effect/ai` would replace the AI SDK tier only — the Agent would still need to be there, and its interface is built around the Vercel AI SDK's `streamText`. Swapping in `@effect/ai` means rewriting the Agent fork in `packages/db/lib/agent-client/**`, which is explicitly out of scope.
- Provider coverage is a wash (we use OpenRouter routing today; `@effect/ai-openrouter` exists).

Revisit later if we rewrite the agent-client layer.

### Observability — confirmed patterns

- One span per generation via `Effect.withSpan("stream.generation", { attributes: { threadId, generationId, model } })`.
- Child spans for discrete steps: `"stream.init"`, `"stream.consume"`, `"stream.followups"`.
- `Effect.annotateCurrentSpan("first_text_at_ms", elapsed)` from inside `onChunk` to measure TTFB.
- `Effect.log*` for the narrative log; `Effect.annotateLogs({ threadId, generationId })` at the root so every child log inherits.
- Errors that pass through `Effect.catch*` get annotated on the current span automatically (the runtime attaches cause).
- If/when we wire OTEL: `@effect/opentelemetry@beta` → `NodeSdk.layer(() => ({...}))`.

---

## 2. Target architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Convex internalAction `streamResponse`  (Promise boundary)        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Effect.runPromise(program, { signal })                      │  │
│  │    — translate Exit → void + emit user-facing system message │  │
│  │                                                              │  │
│  │  program = Effect.scoped(Effect.gen(function* () {           │  │
│  │    yield* Effect.annotateLogs({ threadId, generationId })    │  │
│  │    yield* EarlyAbortGate                                     │  │
│  │    yield* Effect.fork(AbortWatcher)   // polls wasAborted    │  │
│  │                                                               │  │
│  │    yield* AcquireGenerationEvents      // clearForGeneration │  │
│  │                                        //   in finalizer     │  │
│  │                                                               │  │
│  │    const result = yield* InitStream     // tagged: StreamInitError
│  │    yield* ConsumeStream(result)         // tagged: StreamConsumeError
│  │    yield* GenerateFollowUps(result)     // only happy path  │  │
│  │  })).pipe(                                                   │  │
│  │    Effect.withSpan("stream.generation", { attrs }),          │  │
│  │    Effect.catchTag("StreamInitError",    …userMsg "…"),     │  │
│  │    Effect.catchTag("StreamConsumeError", …userMsg "…"),     │  │
│  │    Effect.catchTag("ProviderError",      …userMsg "…"),     │  │
│  │    Effect.catchCause(cause => logDefect(cause))             │  │
│  │  )                                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Services (Context.Service) — thin Convex-ctx wrappers:            │
│   • ThreadState     wasAborted, logSystemError(tagName,msg)        │
│   • ThreadEvents    emit, clearForGeneration                       │
│   • AgentRuntime    continueThread().streamText                    │
│   • FollowUps       generate, save                                 │
└────────────────────────────────────────────────────────────────────┘
```

### Key design choices

1. **Effect edge at the action body.** The `handler: async (ctx, args) => {}` body becomes `Effect.runPromise(program, { signal: <derived> })`. Everything inside is Effect. Everything outside is plain Convex.

2. **Services wrap `ctx` not globally.** Each invocation of `streamResponse` builds a `Layer` from `ctx` and `args` and provides it. Services are not singletons — they close over this generation's `ctx`.

3. **Abort → fiber interruption.** A forked fiber polls `wasAborted` at ~500 ms. When it flips, it calls `Effect.interrupt` on the main fiber. All branches collapse because interrupt runs finalizers for free — **the `if (aborted)` checks disappear entirely**. `generateFollowUps` only runs on successful exit, never after interrupt (because it lives after the yield that was interrupted).

   *Answering your question 2:* "Polling vs subscription": Convex actions cannot subscribe to queries mid-execution (actions are one-shot and don't have the reactive client). The polling approach is the only viable one; Effect just lets us express it as a forked fiber whose only job is to convert external state into a fiber-interrupt signal. Same 500 ms cadence as today, cleaner shape.

4. **Scope-owned resources replace the duplicated cleanup.** The two logical resources held by a generation are:
   - `threadEvents` for this `generationId` — acquired implicitly when we emit; finalizer calls `clearForGeneration`.
   - (nothing else — the `streamingMessages` row and pending assistant message are owned inside `DeltaStreamer` / Agent component and we're not changing those).

   This means there is exactly **one** call site for `clearForGeneration` (in a finalizer), not three.

5. **Errors as tagged errors.** One class per failure mode. No error-code strings. User-facing messages live in a single `userMessageFor(error)` mapping.

6. **One span per generation.** `Effect.withSpan("stream.generation")` wraps the whole program. Children for `"stream.init"`, `"stream.consume"`, `"stream.followups"`. Annotations at key points (`first_text_at_ms`, `step_count`, `token_count`, `model`, `finish_reason`).

---

## 3. File layout

All new code lives in `packages/db/src/ai/stream-response/` (new directory). Only `packages/db/src/ai/agents.ts` gets modified — just the `streamResponse` export; the rest (`generateResponse`, `generateFollowUps`, `agent` singleton, `makeOnChunk`) stays untouched for now.

```
packages/db/src/ai/stream-response/
├── index.ts              // exports `runStreamResponse(ctx, args): Promise<void>`
├── program.ts            // the Effect.gen program
├── errors.ts             // Data.TaggedError classes + userMessageFor mapper
├── services/
│   ├── thread-state.ts   // wasAborted, logSystemError
│   ├── thread-events.ts  // emit, clearForGeneration, scoped acquireRelease
│   ├── agent-runtime.ts  // continueThread().streamText wrapper
│   └── follow-ups.ts     // generateFollowUps + save
├── abort-watcher.ts      // forked fiber that polls and interrupts
└── layer.ts              // buildLayer(ctx): Layer<Services>
```

`packages/db/src/ai/agents.ts` `streamResponse` shrinks to:

```ts
import { runStreamResponse } from "./stream-response";

export const streamResponse = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string(),
          model: v.optional(v.string()), generationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => { await runStreamResponse(ctx, args); },
});
```

---

## 4. Error taxonomy

```ts
// errors.ts
import { Data } from "effect";

export class EarlyAborted extends Data.TaggedError("EarlyAborted") {}

export class StreamInitError extends Data.TaggedError("StreamInitError")<{
  cause: unknown;
  model: string;
}> {}

export class StreamConsumeError extends Data.TaggedError("StreamConsumeError")<{
  cause: unknown;
}> {}

export class FollowUpGenerationError extends Data.TaggedError("FollowUpGenerationError")<{
  cause: unknown;
}> {}

export type StreamResponseError =
  | StreamInitError
  | StreamConsumeError
  | FollowUpGenerationError;
// Note: EarlyAborted and user-abort (interrupt) are NOT in this union — they're
// "normal" exits.

export function userMessageFor(e: StreamResponseError): string {
  switch (e._tag) {
    case "StreamInitError":
      return "Something went wrong starting your response. Please try again.";
    case "StreamConsumeError":
      return "Something went wrong streaming your response. Please try again.";
    case "FollowUpGenerationError":
      // Intentionally silent — follow-ups are best-effort.
      return "";
  }
}
```

Replaces today's `G1` / `G2` codes entirely. `logSystemError` becomes `ThreadState.writeUserFacingError(threadId, userMessage)` — the tag name goes into the span/log (for us), the user message goes into the assistant message (for them).

---

## 5. Services — sketched signatures

```ts
// services/thread-state.ts
export class ThreadState extends Context.Service<
  ThreadState,
  {
    readonly wasAborted: (args: { threadId: string; generationId: string })
      => Effect.Effect<boolean>;
    readonly writeUserFacingError: (args: { threadId: string; message: string })
      => Effect.Effect<void>;
  }
>()("StreamResponse/ThreadState") {}

// services/thread-events.ts
export class ThreadEvents extends Context.Service<
  ThreadEvents,
  {
    readonly emit: (args: { threadId: string; generationId: string;
                            eventType: EventType }) => Effect.Effect<void>;
    readonly clearForGeneration: (generationId: string) => Effect.Effect<void>;
    // scoped: returns an effect that on exit calls clearForGeneration
    readonly scopedGeneration: (generationId: string) => Effect.Effect<void>;
  }
>()("StreamResponse/ThreadEvents") {}

// services/agent-runtime.ts
export class AgentRuntime extends Context.Service<
  AgentRuntime,
  {
    readonly streamText: (args: StreamTextArgs)
      => Effect.Effect<StreamTextResult, StreamInitError>;
    readonly consumeStream: (result: StreamTextResult)
      => Effect.Effect<void, StreamConsumeError>;
  }
>()("StreamResponse/AgentRuntime") {}
```

Each service's `Live` layer is built from the Convex `ctx`:

```ts
// layer.ts
export const buildLayer = (ctx: ActionCtx) =>
  Layer.mergeAll(
    ThreadState.layerFromCtx(ctx),
    ThreadEvents.layerFromCtx(ctx),
    AgentRuntime.layerFromCtx(ctx),
    FollowUps.layerFromCtx(ctx),
  );
```

---

## 6. The program

```ts
// program.ts
const makeProgram = (args: Args) =>
  Effect.scoped(
    Effect.gen(function* () {
      const { threadId, promptMessageId, generationId, model } = args;

      // Root-level log annotations — every log inside inherits these.
      yield* Effect.annotateLogs({ threadId, generationId, model: model ?? "default" });

      const threadState  = yield* ThreadState;
      const threadEvents = yield* ThreadEvents;
      const agentRuntime = yield* AgentRuntime;
      const followUps    = yield* FollowUps;

      // Early abort gate — if the scheduler picked us up after abort committed.
      const abortedEarly = yield* threadState.wasAborted({ threadId, generationId });
      if (abortedEarly) {
        yield* Effect.log("early-abort; skipping generation");
        return;
      }

      // Scope-owned: guarantees clearForGeneration runs on any exit
      // (success, error, interrupt, defect).
      yield* threadEvents.scopedGeneration(generationId);

      // Forked watcher → interrupts parent fiber when wasAborted flips.
      const parent = yield* Effect.fiberId;
      yield* Effect.forkScoped(
        abortWatcher({ threadId, generationId, parent, intervalMs: 500 })
      );

      // Init. Tagged StreamInitError on failure.
      const result = yield* agentRuntime.streamText({
        threadId, promptMessageId, model, generationId,
      }).pipe(Effect.withSpan("stream.init"));

      // Consume. Tagged StreamConsumeError on failure.
      yield* agentRuntime.consumeStream(result).pipe(
        Effect.withSpan("stream.consume")
      );

      // Happy path only — this line is unreachable if anything above throws or interrupts.
      yield* followUps.generate({ threadId, responseText: result.text }).pipe(
        Effect.withSpan("stream.followups"),
        Effect.catchTag("FollowUpGenerationError", (e) =>
          Effect.logWarning("follow-ups failed", { cause: e.cause })
        ),
      );
    })
  ).pipe(
    Effect.withSpan("stream.generation", {
      attributes: { threadId: args.threadId, generationId: args.generationId }
    }),
    // Surface user-facing errors, swallow them from the action's return type.
    Effect.catchTags({
      StreamInitError: (e) =>
        ThreadState.pipe(Effect.flatMap(s =>
          s.writeUserFacingError({
            threadId: args.threadId,
            message: userMessageFor(e),
          })
        )).pipe(Effect.tap(() => Effect.logError("stream-init failed", { cause: e.cause }))),
      StreamConsumeError: (e) =>
        ThreadState.pipe(Effect.flatMap(s =>
          s.writeUserFacingError({
            threadId: args.threadId,
            message: userMessageFor(e),
          })
        )).pipe(Effect.tap(() => Effect.logError("stream-consume failed", { cause: e.cause }))),
    }),
    // Defects (unexpected throws) — still logged, still finalize cleanly.
    Effect.catchCause((cause) =>
      Effect.logError("stream-response defect", { cause })
    ),
  );
```

### `abortWatcher`

```ts
// abort-watcher.ts
export const abortWatcher = (args: {
  threadId: string; generationId: string; parent: FiberId; intervalMs: number;
}) =>
  Effect.gen(function* () {
    const threadState = yield* ThreadState;
    while (true) {
      yield* Effect.sleep(Duration.millis(args.intervalMs));
      const aborted = yield* threadState.wasAborted({
        threadId: args.threadId, generationId: args.generationId
      });
      if (aborted) {
        yield* Effect.log("user-abort detected; interrupting generation");
        yield* Fiber.interruptAs(args.parent);
        return;
      }
    }
  });
```

Note: `onChunk` today also polls inside the AI SDK callback. Decide at impl time whether to:
- **Option A (recommended):** Keep `makeOnChunk`'s polling behavior exactly as-is (it cancels the LLM mid-chunk faster than a fiber sleep loop could). The forked watcher is the *backup* that also interrupts the Effect fiber after the abort signal fires. Both will eventually converge.
- **Option B:** Delete `makeOnChunk`'s polling, rely on just the forked watcher + Effect interrupt propagating through an `AbortSignal` bridge.

Go with A for the first pass — it's the smallest delta.

### `ctx.runPromise` and `AbortSignal` bridging

The Convex action handler has no `AbortSignal` parameter for us to forward. But we *do* want the Effect fiber's interrupt signal to flow into `thread.streamText`'s `abortSignal` argument. Use:

```ts
// In AgentRuntime.streamText:
const abortController = new AbortController();
return Effect.acquireRelease(
  Effect.sync(() => abortController),
  (ac) => Effect.sync(() => ac.abort("effect-interrupt"))
).pipe(
  Effect.flatMap(ac =>
    Effect.tryPromise({
      try: () => thread.streamText({ ..., abortSignal: ac.signal }),
      catch: (cause) => new StreamInitError({ cause, model }),
    })
  )
);
```

The finalizer calls `.abort()` on success, failure, *and* interrupt — so interrupts propagate through to the AI SDK for free.

---

## 7. Mapping: today's pain point → Effect primitive

| Current behavior | Replaced by |
|------------------|-------------|
| `tryCatch(thread.streamText(...))` returning `{ data, error }` | `Effect.tryPromise({ try, catch: e => new StreamInitError({ cause: e, model }) })` |
| `tryCatch(Promise.resolve(result.consumeStream()))` | `Effect.tryPromise({ try, catch: e => new StreamConsumeError({ cause: e }) })` |
| `if (streamInitError) { … clearForGeneration … return }` | Finalizer registered by `scopedGeneration` — runs automatically |
| `if (streamError) { ... }` | `Effect.catchTag("StreamConsumeError", ...)` at top level |
| `if (!aborted) { await generateFollowUps(...) }` | Natural control flow — if we reach the `followUps.generate` line, we didn't error or interrupt |
| `makeOnChunk` 500ms poll | Forked `abortWatcher` fiber + (optionally) keep onChunk poll as a faster mid-chunk short-circuit |
| `logSystemError(ctx, threadId, "G1", "Failed to initialize...")` | `Effect.logError("stream-init failed", { cause })` + `writeUserFacingError(userMessageFor(e))` |
| `console.log` sidechannel | `Effect.log*` with structured annotations |
| "is this an abort or an error?" branching repeated 3× | Interrupt vs. failure is a first-class distinction in `Exit`; no branching needed |

---

## 8. Implementation order (for the next agent)

1. **Install & pin.** `pnpm -F db add effect@beta`. Capture the exact version in `package.json`. Run typecheck to confirm it loads in the TS project references.
2. **Create `stream-response/errors.ts`.** Error classes + `userMessageFor`. Unit test the mapping.
3. **Create services with stub implementations.** `ThreadState`, `ThreadEvents`, `AgentRuntime`, `FollowUps`. Each with a `layerFromCtx(ctx)` constructor that returns a `Layer`. Don't wire to real Convex yet — hardcode returns so the program typechecks.
4. **Write the program** (§6). Typecheck against stubs. Confirm `Effect.gen` inference works with v4 beta — this is the biggest API-drift risk.
5. **Wire services to real Convex ctx.** Move the real `ctx.runQuery/runMutation` calls into `layerFromCtx` builders. Delete `tryCatch` usage in the new path; use `Effect.tryPromise` instead.
6. **Implement `abortWatcher`** and fork it. Add `Fiber.interruptAs` on abort.
7. **Wire OpenTelemetry (optional for first merge).** `pnpm -F db add @effect/opentelemetry@beta` + the OTEL peer deps. Provide `NodeSdk.layer` at the edge. If we're not sending traces anywhere yet, skip this and rely on `Effect.log*` which still respects spans for structured logging.
8. **Replace the `streamResponse` handler body** with `await runStreamResponse(ctx, args)`. Delete `makeOnChunk`'s event-emit logic only if we move it into the AgentRuntime service; otherwise leave as-is.
9. **Delete** `logSystemError`'s `"G1"` / `"G2"` codes once no caller references them. (`lifecycle.ts` and `messages.ts` also use `logSystemError` — those callers are out of scope; keep the function signature.)
10. **Validation:** `pnpm run lint && pnpm run typecheck && pnpm run format:fix` per CLAUDE.md.
11. **Manual test matrix** (see §9).

### Files the agent will create

- `.plans/effect-streamresponse-rewrite.md` (this file — already exists)
- `packages/db/src/ai/stream-response/index.ts`
- `packages/db/src/ai/stream-response/program.ts`
- `packages/db/src/ai/stream-response/errors.ts`
- `packages/db/src/ai/stream-response/abort-watcher.ts`
- `packages/db/src/ai/stream-response/layer.ts`
- `packages/db/src/ai/stream-response/services/thread-state.ts`
- `packages/db/src/ai/stream-response/services/thread-events.ts`
- `packages/db/src/ai/stream-response/services/agent-runtime.ts`
- `packages/db/src/ai/stream-response/services/follow-ups.ts`

### Files the agent will modify

- `packages/db/src/ai/agents.ts` — only the `streamResponse` export's `handler`. Leave `generateResponse`, `generateFollowUps`, `agent`, `makeOnChunk` intact (or move them into the new folder if and only if nothing outside the file references them — check before moving).
- `packages/db/package.json` — add `effect` (and optionally `@effect/opentelemetry`).

### Files the agent will NOT touch

- `packages/db/lib/agent-client/**` (DeltaStreamer, stream_text.ts, generation.ts, save.ts)
- `packages/db/src/agent/**` (streams.ts, schema.ts, handlers/)
- `packages/db/src/ai/thread/helpers.ts` — `logSystemError` signature stays; we just stop calling it from the new path.
- Any client code in `apps/**`.

---

## 9. Test matrix

Manual smoke tests post-implementation (no automated tests exist for this action today; adding them is optional):

1. **Happy path** — send a prompt, confirm streamed response, assistant message lands in "success" state, follow-up questions appear.
2. **User abort mid-stream** — send a prompt, hit stop after first text chunk. Confirm: no `FollowUpGenerationError`, no user-facing error message, `threadEvents` cleared, `streamingMessages` row resolves to `aborted`, one span per generation with a `finish_reason: aborted` attribute (or whatever we name it).
3. **User abort pre-execution** — race where the action is scheduled but abort commits before `handler` runs. Early-abort gate handles this. Confirm no side effects.
4. **Provider init failure** — point at an invalid model name. Confirm `StreamInitError` → user sees "Something went wrong starting your response." → assistant message saved with that text → span has `exception` attribute.
5. **Provider mid-stream failure** — simulate with a model that 500s mid-stream. Confirm `StreamConsumeError` → user sees appropriate message → span captures it.
6. **Follow-up generation failure** — force `generateObject` to fail. Confirm: main stream still shows "success", warning logged, no user-facing error (follow-ups are best-effort).
7. **Unexpected defect** — throw from inside a service impl. Confirm `Effect.catchCause` logs it and cleanup still runs.

---

## 10. Open questions / decisions for the implementer

1. **Exact Effect v4 API surface.** Before starting, spend 20 min verifying: `Effect.runPromise(effect, { signal })` works in the beta, `Effect.forkScoped` exists, `Data.TaggedError` is in the stable namespace (not `effect/unstable/*`). The migration guide's sub-docs (`migration/*.md` in `effect-smol` repo) are the source of truth.
2. **Keep `makeOnChunk`'s poll or not?** Recommend keep for pass 1. Deleting it is a follow-up.
3. **Where does `first_text_at_ms` get measured?** Cleanest spot is inside `makeOnChunk` when `responseStreamingEmitted` flips — have it call a closure captured from the Effect program that annotates the span. Or: emit a Convex event and translate after-the-fact. First is simpler.
4. **Do we wire OpenTelemetry now or later?** Plan assumes later. Spans still exist in the Effect runtime even without an exporter — `Effect.log*` respects them for structured output. That's enough to get "one log per generation" wins without OTEL infrastructure.
5. **Should `generateResponse` (the non-streaming variant on line 50) also migrate?** Scope says no. Flag for a future pass.

---

## 11. References

- Effect v4 beta announcement: https://effect.website/blog/releases/effect/40-beta/
- Migration index: https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md
- Services migration: https://github.com/Effect-TS/effect-smol/blob/main/migration/services.md
- Error-handling migration: https://github.com/Effect-TS/effect-smol/blob/main/migration/error-handling.md
- Runtime migration: https://github.com/Effect-TS/effect-smol/blob/main/migration/runtime.md
- Effect tracing docs (v3, but v4 semantics unchanged): https://effect.website/docs/observability/tracing
- Effect logging docs: https://effect.website/docs/observability/logging
- `@effect/ai` reference (for future consideration): https://github.com/tim-smart/effect-io-ai

### Current-code anchors (line numbers as of planning)

- `packages/db/src/ai/agents.ts:152-243` — `streamResponse` action body
- `packages/db/src/ai/agents.ts:108-150` — `makeOnChunk`
- `packages/db/src/ai/thread/helpers.ts:100-121` — `logSystemError`
- `packages/db/src/ai/thread/state.ts` — `wasAborted` query
- `packages/db/src/ai/thread/events.ts` — `emit`, `clearForGeneration`
- `packages/db/lib/agent-client/delta_streamer.ts` — DeltaStreamer (not touched, for reference)
- `packages/db/lib/agent-client/stream_text.ts` — `awaitStreamCompletion` try/catch we're obsoleting at the call site
