# Wave 4 — Effect Adoption (Optional, Narrowly Scoped)

> **Status:** Not started. **Optional.**
> **Estimated effort:** ~1 week, narrowly scoped to a single action.
> **Prerequisite:** Waves 1, 2, and 3 should be substantially complete. Wave 2's `streamResponse` rewrite especially — Effect plugs into that file.
> **Reassess before starting.** This wave was deliberately deferred during the planning conversation. After Waves 1–3 land, the user may find that the streaming/abort error story is good enough that Effect isn't needed. **Do not start this wave without an explicit "yes, proceed" from the user.**

---

## Source of intent

Pulled from the Notion task **"Better error handling"** (https://www.notion.so/3413b59a4f9c80bea006f8575bfacd96).

Direct quote (this is the entire problem statement):

> Generating responses from the LLMs is becoming a little bit difficult to reason about. There's a bunch of different places that errors can be thrown, and there's a bunch of different calls happening in different places, and it's all getting a little bit difficult to reason about. I'm having lots of bugs be introduced, I'm having trouble gracefully handling errors, and it's really just getting out of control.
>
> I think the way I want to move forward is introducing something to my convex package and perhaps across my full stack to make handling these complex workflows a little bit easier. And my first choice is Effect.
>
> I think this codebase will work really well with effect. And one library I've really wanted to try out for a while is called confect. It creates a first-class integration of effect with convex and I think it could make it much easier to reason about the complex workflows like creating new messages and new threads and streaming them back. Because right now I'm having a lot of trouble managing in my head how these workflows happen gracefully handling them when errors occur, gracefully handling a boarding in the middle of the generations and stuff like that. I think a library like this could really help tie things together nicely.
>
> I'm also open to having end-to-end effect so we could have this go all the way to the front end for error handling and whatnot. I don't know if that's the right choice. I'm not sure if perhaps we should just isolate effect to the actions and not use confect and just have the effect handled in the actions. I think it might make sense to have it in the mutations and queries as well, but I'm not totally sure.

---

## Why deferred + why narrowly scoped

The planning conversation arrived at this decision after the research subagents reported. Key findings:

1. **Effect is the most invasive of the six initiatives.** It changes function contracts across the stack.
2. **Confect would force a re-do** of Wave 1 Track B (extended context wrapper) and Wave 2 (batching layer). Adopting it before those stabilizes is wasteful.
3. **The user's stated pain is in `streamResponse`** — opaque G1/G2 error codes, hard-to-reason error flow during streaming, abort handling. That's a single function. Wrap that one function.
4. **Wave 2 already cleans up much of the pain.** Events-derived state and batched mutations remove a lot of the "where can errors come from" ambiguity. After Wave 2, evaluate whether Effect is still needed.

We are **explicitly choosing Option A** from the four options the research subagent enumerated:
- **Option A (this wave)** — Effect inside `streamResponse` only. Coexists with current `tryCatch`. Easy to revert.
- Option B — Effect in all Convex actions. Defer; revisit after Option A.
- Option C — Confect for queries/mutations. **Don't do.** Maturity / breaking-change risk too high; conflicts with our context wrapper.
- Option D — End-to-end Effect (UI included). **Don't do.** Unproven for React; massive churn.

---

## Current state findings (from research subagent)

### Pain points today (verify these still exist after Wave 2 — some may already be gone)

- **`/packages/db/src/ai/agents.ts`** (around lines 86–146): `streamResponse` action uses a manual `tryCatch` wrapper; logs opaque error codes G1, G2 via `logSystemError`; stores errors as system messages. **This is the file Wave 4 wraps with Effect.**
- **`/packages/db/src/ai/thread/lifecycle.ts` and `/packages/db/src/ai/thread/messages.ts`** (scheduler call sites in `create` / `send`): try-catch around scheduler calls; errors propagate via `console.error` + system error message.
- **`/packages/db/src/ai/thread/helpers.ts`** (around lines 60–78): `logSystemError` writes a formatted string (e.g. `--SYSTEM_ERROR--G1`) as a message to the thread. Users see opaque codes.
- **`/packages/features/src/composer/hooks/use-send-message.ts`** (around lines 22–28): client extracts `ConvexError` via `error.data` or falls back to a generic message. No error context / tracing.
- **`/packages/features/src/messages/util/message-util.ts`** (around lines 51–56): error codes G1/G2 map to themselves rather than human-readable text.

### Existing minimal Result wrapper

- `/packages/db/src/lib/utils.ts` has a minimal `Result<T>` wrapper (no composition, no context enrichment). Effect supersedes this — but only within scoped files.

### Effect / Confect dependency status

- Effect is **not** currently a dep anywhere in the repo (per subagent search). Wave 4 introduces it.
- start-faster (the user's reference project) **does not** use Effect/Confect either, per subagent research.
- Confect is not a dep. **Stays out of scope** for this wave.

---

## Scope of this wave

**One file, one action: `/packages/db/src/ai/agents.ts::streamResponse`.**

Add Effect as a dep. Use it to model:
- The two-phase stream lifecycle (init → consume).
- Discriminated error union: `StreamError = StreamInitError { code: "G1", cause } | StreamConsumptionError { code: "G2", cause } | AbortedByUser`.
- Abort signal as an Effect cancellation.
- Error → user-facing message mapping at the boundary (replace opaque G1/G2 with human-readable strings while still emitting the code for telemetry).

**Out of scope for this wave:**
- Other actions (Wave 5+ if pursued).
- Mutations, queries.
- Confect.
- Any client-side Effect.
- Replacing the existing `Result<T>` wrapper in `/packages/db/src/lib/utils.ts`.

---

## Steps

1. **Reassess before starting.** Read the current state of `streamResponse` after Wave 2. Confirm with user that Effect is still the right move. (See Q1 below.)
2. **Add Effect to deps:** `pnpm add effect` (or whichever subset — `@effect/io`, etc.) to `packages/db/package.json`.
3. **Create `/packages/db/src/lib/effect-utils.ts`:**
   - `toEffect<T>(promise: Promise<T>): Effect<T, AppError, never>` for wrapping async-throws.
   - `runEffect<T>(effect: Effect<T, AppError, never>): Promise<T>` for the boundary back to Convex action return type.
   - `handleAppError(error: AppError): ConvexError` for backwards-compat at the action boundary.
4. **Define the error union** (file location TBD — likely `/packages/db/src/ai/agents.errors.ts`):
   ```
   type StreamError =
     | { _tag: "StreamInitError"; code: "G1"; cause: unknown }
     | { _tag: "StreamConsumptionError"; code: "G2"; cause: unknown }
     | { _tag: "AbortedByUser" }
   ```
5. **Refactor `streamResponse`** to use `Effect.gen`:
   - Wrap LLM init in an Effect that fails with `StreamInitError`.
   - Wrap the streaming consumption in an Effect that fails with `StreamConsumptionError`.
   - Race against the abort signal so cancellation produces `AbortedByUser`.
   - At the end, use `.pipe(Effect.catchTag(...))` to emit the right event (per Wave 2's events table) and return a sensible result.
6. **Replace `logSystemError` calls** in this one action with Effect-based error tagging that emits a `generation_failed` event (Wave 2 taxonomy) with the structured `StreamError` as metadata. (After Wave 2 Phase 2d, `logSystemError` already writes a typed `systemEvent: { kind: "error", code }` field — Effect's error tags map directly onto those codes, no string formatting involved.)
7. **User-facing message mapping:** after Wave 2 Phase 2d, the old self-mapping in `message-util.ts` is gone; error strings live in a frontend `ERROR_MESSAGES` map keyed by code. If any code needs richer human-readable text as a result of this Effect work, update that map. No `message-util.ts` rewrite needed.
8. **Test heavily**: stream init failures (force a bad model id), stream mid-flight failures (kill network), user abort (mid-stream), abort + immediate resend, abort + retry-on-backend (if applicable). All should produce sensible events + clear UI errors.

---

## Open questions for the user (ASK BEFORE PROCEEDING)

- **Q1.** Confirm we're still doing this. After Waves 1–3, are the LLM-streaming errors and abort handling still painful? If not, **drop this wave entirely.**
- **Q2.** Is Option A the right scope, or does the user want to push to Option B (all actions) right away? Recommend Option A first, then evaluate.
- **Q3.** Confect is explicitly out of scope. Confirm the user is OK with this — the Notion doc said "I'd really like to try out [Confect]" but the planning conversation deferred it for compatibility reasons. **Get explicit agreement to defer Confect.**
- **Q4.** Effect on the client (Option D) is also out. Confirm.
- **Q5.** Error union design: discriminated union with `_tag` is the Effect convention. Confirm we want to use `_tag` (the Effect default) and not invent a custom shape.
- **Q6.** After this wave, should we plan a follow-up wave to expand to other actions in `packages/db/src/ai/tools/*/actions.ts` and `packages/db/src/mail/actions.ts`? Recommend leaving as a separate decision after this wave proves out.
- **Q7.** Bundle-size concern: Effect adds a non-trivial dep to the Convex backend. Convex has function size limits. Verify Effect won't push us over.
- **Q8.** Abort signal integration: confirm `Effect.race(effect, abortPromise)` is the right pattern for our use case, vs. Effect's built-in cancellation (which may require restructuring more than just one action).

---

## Validation

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`.
- All existing streaming tests pass.
- Manual: trigger an init failure (e.g., bad API key) → user sees a clear error message, not "G1".
- Manual: trigger a mid-stream failure → clear error, no stuck state.
- Manual: abort mid-stream → clean cancellation, no leaked timers, no error message shown to user.
- Wave 2's events table shows the right `generation_failed` events with structured metadata.
- Convex deploy succeeds (function size OK).

---

## Risks specific to this wave

- **Effect learning curve.** If the agent doing this work is unfamiliar with Effect, expect ramp-up time; recommend reading the official Effect docs end-to-end before touching code.
- **Convex bundle size.** See Q7.
- **Abort handling regressions.** The abort path in `streamResponse` is delicate. Wave 2 already touched it. Double-check that Effect's cancellation semantics line up with what the schedulers and `AbortController` expect.
- **Reversibility.** Option A is supposed to be cheap to revert. Keep changes truly isolated to one action — if the agent finds themselves touching helpers in other files, stop and reconsider.

## Cross-wave dependencies

- **Requires** Wave 2 (the events table; this wave emits `generation_failed` events with structured metadata).
- **No interaction** with Waves 1 Track A or Wave 3 — they're frontend-pattern work.
- **Unrelated to** Wave 1 Track B's context wrapper (Effect doesn't need to read the prefetched context for this scope).
