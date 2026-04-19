# Handoff → Wave 2 Phase 2c

> Short, targeted context for 2c. Historical detail on 1A/1B/2a/2b lives
> in `findings-archive.md` — only read that if you need *why* something
> is the way it is. This doc is the *what's true now* + *what 2c must do*.

---

## Current state of thread state

- `threads.state` is a `"idle" | "waiting" | "streaming"` field in the
  schema and is **dual-written** today:
  - `ai.thread.mutations.sendMessage` / `create` → `"waiting"`
  - `ai.thread.mutations.startStreamingIfWaiting` → `"streaming"` (called
    from `streamResponse` action at stream setup)
  - `ai.thread.mutations.resetIdleIfStreaming` → `"idle"` (at
    `streamResponse` cleanup)
  - `ai.thread.mutations.abortGeneration` → `"idle"`
- The UI reads it via `threadQueries.state(threadId)` (lives in
  `packages/features/src/thread/lib/queries.ts`). Backend query is
  whatever that alias points at in `packages/db`.

## Current state of threadEvents

- Table exists with indexes `threadId_timestamp` and `generationId`.
- Taxonomy: **3 events** only — `user_message_sent`, `agent_working`,
  `response_streaming`. No terminal events; cycle end = "no rows for
  this generationId."
- `agent_working` fires from **inside `onChunk`** on the first chunk
  of any kind (tool-call / reasoning / source / text-delta).
  `response_streaming` fires on the first `text-delta`. If the first
  chunk is text-delta, both fire in sequence.
- `emitThreadEvent` has a cycle-active guard for non-user events (no-op
  if no row exists for the generationId) — protects against the
  abort-vs-emit race.
- Helper file: `packages/db/src/ai/thread/events.ts`.

## What 2c must do

1. **Add `getStateFromEvents` query** in `packages/db/src/ai/thread/`.
   Mapping: latest-event → state. `user_message_sent` → `"waiting"`,
   `agent_working`/`response_streaming` → `"streaming"`, no rows →
   `"idle"`. O(1) via the `threadId_timestamp` index.
2. **Feature-flag the switch** inside the backend query that
   `threadQueries.state(...)` resolves to. Flip back if anything breaks.
3. **No backfill.** Pre-existing threads with no events derive to
   `"idle"`, which is correct.
4. **Cut the dual-write.** Remove `setState`, `startStreamingIfWaiting`,
   `resetIdleIfStreaming`. Remove `state` patches from `create`,
   `sendMessage`, `abortGeneration`, `streamResponse`.
5. **Drop the `state` field** from `threads` schema.
6. **Rewrite `wasAborted`** (currently reads `thread.state === "idle"`)
   as: "is there any event for this thread's active generationId?" If
   no rows → user aborted (because `clearEventsForGeneration` wipes on
   abort).
7. **Remove `generationFnId` handling** where it's paired with state
   transitions. The scheduled-function cancel path in `abortGeneration`
   still needs `generationFnId`, so keep that — just decouple it from
   state patches.

## File-split cleanup (do *during* 2c)

User's rubric for readable dotted paths: flat verb for single ops,
nested noun group only when there are multiple related ops.

Target layout after 2c:

```
packages/db/src/ai/thread/
├── title.ts            → generate / set / rename   → ai.thread.title.*
├── state.ts            → getStateFromEvents + any  → ai.thread.state.*
│                         internal helpers needed
├── events.ts           → existing                  → ai.thread.events.*
├── create.ts           → create                    → ai.thread.create
├── sendMessage.ts      → sendMessage               → ai.thread.sendMessage
├── abortGeneration.ts  → abortGeneration           → ai.thread.abortGeneration
├── deleteThread.ts     → deleteThread              → ai.thread.deleteThread
├── togglePinned.ts     → togglePinned              → ai.thread.togglePinned
├── saveFollowUps.ts    → saveFollowUps             → ai.thread.saveFollowUps
├── helpers.ts          → existing (non-exported helpers)
└── mutations.ts        → DELETED
```

`setState`, `startStreamingIfWaiting`, `resetIdleIfStreaming`,
`wasAborted` all go away during 2c — no need to split before.

## Parked (do **after** 2c)

1. **AgentComponent type + `component` plumbing removal.** The shim
   *file* is gone but the type is still threaded through every client
   helper in `packages/db/src/agent/client/` (~10–12 files). The cast
   `internal.agent as unknown as AgentComponent` in `ai/agents.ts` is
   the visible symptom. Drop the type, remove the parameter from every
   signature, replace `component.X.Y` with `internal.agent.X.Y`
   (action-side) or direct handler calls (mutation-side). Pure
   hygiene, no behavior change. User explicitly flagged it as mucky.
2. **Re-measure latency.** Wave 1B baseline: 509 ms mean `sendMessage`
   `executionTime`. 2b's changes (inlined mutation→mutation hops,
   100 ms delta batch, first-chunk `agent_working`) should reduce
   this. Haven't measured yet. Worth doing during 2c soak.

## Known behaviors / gotchas

- **`callSettings: { maxRetries: 0 }`** in `agents.ts`. Set in 2b to
  stop the AI SDK from replaying the whole generation after a user
  abort. If we ever need retries back, gate on a predicate that
  returns false when `getActiveGenerationId(ctx, threadId) !== generationId`.
- **Delta streamer batches at 100 ms OR 10 parts**, first delta
  immediate. Tunable via `StreamingOptions.throttleMs` /
  `.maxPartsPerFlush`.
- **`generationId` is optional** on the `streamResponse` action arg —
  back-compat shim from 2a. Safe to drop in 2c once any pre-2a
  scheduled jobs have drained.
- **Keep `streamingMessages.state` and `messages.status`.** Different
  semantics (per-stream lifecycle / per-message status). Load-bearing.
- **`wave-2-agent-state-refactor.md` still documents the original
  5-event taxonomy.** It's stale; this handoff is authoritative for
  2c. Don't re-read the plan file expecting accurate event names.

## Validation after each step

Always `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`.
Manual test the send / abort / resume flow in a browser before
calling 2c done.
