# Handoff → Wave 2 Phase 2d

> 2c is shipped. This doc is **what's true now** + **what 2d must do**.
> Historical detail lives in `findings-archive-DONT READ.md` — only read
> that if you need *why* something is the way it is. The original
> `wave-2-agent-state-refactor.md` planning doc has stale details; trust
> this handoff over it.

---

## What 2c actually shipped

### 1. State is event-sourced, no translation layer

- `threads.state` field **dropped** from schema (migration `clearLegacyState`
  ran in dev and prod, then the field + migration were removed).
- Thread "state" is now whatever the latest `threadEvents` row's `eventType`
  is for the thread. No rows → thread is idle (represented as `null`).
- **No `"idle" | "waiting" | "streaming"` vocabulary anywhere.** Event
  types flow top to bottom. UI types import `EventType` from
  `@acme/db/agent/validators` and use `EventType | null`.
- Single helper: `getLatestEvent(ctx, threadId)` in
  `packages/db/src/ai/thread/state.ts` → `EventType | null`. That's it.
- `wasAborted(threadId, generationId)` is "any events for this generationId?"
  If no → user aborted (because abort clears events).

### 2. File layout — noun-dot-verb

The whole `/packages/db/src/ai/thread/` tree was reorganized. **Rubric:**
file name is the noun, export name is the verb. Never produce doubled
paths like `create.create`. Grab-bag files (`mutations.ts`, `queries.ts`)
are split by domain noun.

```
packages/db/src/ai/thread/
├── title.ts        → get, generate, set, rename
├── state.ts        → get, wasAborted, getLatestEvent (helper)
├── events.ts       → emit, clearForGeneration, generateGenerationId, getActiveGenerationId
├── messages.ts     → list, send
├── lifecycle.ts    → create, remove (JS reserved word blocks `delete`)
├── generation.ts   → abort
├── pinned.ts       → toggle
├── followUps.ts    → get, save
├── list.ts         → get (thread-list query)
├── helpers.ts      → shared internals
└── shared.ts       → vAttachment
```

API paths now read: `api.ai.thread.pinned.toggle`,
`api.ai.thread.generation.abort`, `api.ai.thread.messages.send`,
`api.ai.thread.lifecycle.create`, `api.ai.thread.title.generate`.

### 3. Pipeline changes

- `streamResponse` action: `generationId` is now required (optional shim
  removed). No `startStreamingIfWaiting` / `resetIdleIfStreaming` calls —
  those mutations are gone. `wasAborted` check happens before
  `clearForGeneration` so follow-ups can distinguish natural completion
  from abort.
- `agent_working` event emits from `onChunk` on first chunk of any kind
  (was at stream setup in an earlier draft of 2b; 2c kept this).
- `response_streaming` event emits on first text-delta chunk.
- `callSettings: { maxRetries: 0 }` in `agents.ts` — SDK retry-replay is
  disabled so it can't re-stream after a user abort.

### 4. UI shape

- `list.get` returns per-thread `{ id, title, updatedAt, latestEvent, pinned }`.
  `latestEvent` is `EventType | null`.
- `PureThread` / `Thread` types: field is `latestEvent: EventType | null`.
- `thread-list-item.tsx` (+ xr variant) renders Brain icon when
  `thread.latestEvent !== null`.
- `use-send-message.ts`: `isGenerating = threadState != null`.
- `thread.tsx`: `isThreadIdle = latestEvent === null`.

---

## What 2d must do

The parked items from the original 2c handoff are the 2d scope:

### 1. AgentComponent type + `component` plumbing removal

- The cast `internal.agent as unknown as AgentComponent` in
  `packages/db/src/ai/agents.ts` is still there. It was the shim that
  bridged the generated `FunctionReference` shape to the old
  `AgentComponent` type from when the agent was a separate Convex
  Component.
- The `AgentComponent` type is threaded through every helper in
  `packages/db/src/agent/client/` (~10–12 files). Grep `component.X.Y`
  and `AgentComponent` to find them.
- **Goal:** drop the type, remove the `component` parameter from every
  signature, replace `component.X.Y` with `internal.agent.X.Y`
  (action-side) or direct handler calls (mutation-side).
- Pure hygiene, no behavior change. User explicitly flagged this as
  "mucky" back in 2b and wanted it cleaned up after 2c.

### 2. Re-measure `sendMessage` latency

- Wave 1B baseline: **509 ms mean** `sendMessage.executionTime`.
- 2b (inlined mutation→mutation hops, 100 ms delta batch, first-chunk
  `agent_working`) and 2c (no state patches, derived state) should both
  reduce this. Hasn't been measured yet.
- Check Convex dashboard → Insights tab → per-function execution times.

---

## Parked for *after* 2d

- **Mid-generation delete.** User asked about this during 2c testing. The
  plan: when `lifecycle.remove` is called on a non-idle thread, inline the
  abort logic instead of throwing. Requires pulling the abort body out of
  `generation.ts` into a shared helper so both paths call it. Edge case,
  low priority. See chat-history for rationale: user decided to defer.
- **Potential wave 5: merge `/ai/` and `/agent/` folders.** User noticed
  the parallel structure (threads, messages, tools on both sides). The
  `/agent/` tree is runtime / library-ish (originally a standalone
  Convex Component); `/ai/` is product config + user-facing
  queries/mutations. AgentComponent cleanup (item 1 above) reduces one
  layer of friction but doesn't merge. A full merge is a separate wave
  discussion.

---

## Load-bearing gotchas (don't break these)

- **`callSettings: { maxRetries: 0 }`** in `agents.ts`. Don't raise it
  without gating retries on `wasAborted(ctx, threadId, generationId)`
  returning false.
- **Delta streamer batches at 100 ms OR 10 parts**, first delta
  immediate. Tunable via `StreamingOptions.throttleMs` / `.maxPartsPerFlush`.
- **Keep `streamingMessages.state` and `messages.status`.** Different
  concepts from the deleted `threads.state` field — these are per-stream
  and per-message, respectively, and are load-bearing for the agent
  runtime.
- **`generationFnId` on `threads` is kept** (decoupled from state). Only
  used by `generation.abort` to `ctx.scheduler.cancel(...)` a pending
  `streamResponse` job before it calls the LLM.
- **Event-emit guard.** `emitThreadEvent` no-ops on non-user events if no
  row exists for the generationId. This prevents abort-vs-emit races
  from resurrecting a cleared cycle.

---

## Non-obvious design decisions captured from 2c

- **Why `EventType | null` and not `EventType | "idle"`?** The user
  explicitly wanted event vocabulary top to bottom. `null` is the
  absence of an event; inventing an `"idle"` sentinel would re-introduce
  translation-layer baggage.
- **Why is `latestEvent` on `PureThread` instead of a separate
  `state.active` query?** The planning conversation considered splitting
  into two queries (thread metadata + active-generations map). User
  rejected it — too much churn for marginal benefit, and list.get's
  updatedAt already invalidates on every message send, so the
  fine-grained split didn't actually save re-renders.
- **Why is `remove` (not `delete`) the export in `lifecycle.ts`?** `delete`
  is a JS reserved word; TypeScript rejects `export const delete`.
  `api.ai.thread.lifecycle.remove` reads fine. If this ever needs to
  match a specific client idiom, rename to `deleteThread` and accept the
  doubled path — not worth more than a line of thought.
- **Schema field removal needed a migration.** Convex `schemaValidation`
  rejects schema-push when existing rows carry a now-removed field.
  Workflow for 2d if you drop more fields: write an internal mutation to
  unset the field, deploy with the field still in schema (optional), run
  the mutation in all environments, then drop the field in a follow-up
  push. We did exactly this with `state` and `clearLegacyState`.

---

## Validation after each step

Always `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`.
Manual-test send / abort / resume in a browser before calling 2d done.
