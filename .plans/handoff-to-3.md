# Handoff → Wave 3

> Wave 2 (all phases incl. 2d) is shipped. This doc is **what's true now** that
> Wave 3 needs to know. The Wave 3 plan itself lives in
> `wave-3-optimistic-ux.md`. Historical detail lives in
> `findings-archive-DONT READ.md`.

---

## State model (unchanged from 2c, still load-bearing for Phase 3a)

- No `threads.state` field. Thread "state" = `latestEvent: EventType | null`,
  derived from the `threadEvents` table.
- Single helper: `getLatestEvent(ctx, threadId)` in
  `packages/db/src/ai/thread/state.ts` → `EventType | null`.
- `wasAborted(threadId, generationId)` = "any events for this generationId?"
  No rows → user aborted (because abort clears events).
- UI reads state via `useQuery(threadQueries.state(threadId))`; value is
  `EventType | null`. Phase 3a's 3s-timeout removal depends on this.

## File layout — noun-dot-verb

`/packages/db/src/ai/thread/` — file = noun, export = verb. Never produce
doubled paths like `create.create`.

```
title.ts        → get, generate, set, rename
state.ts        → get, wasAborted, getLatestEvent (helper)
events.ts       → emit, clearForGeneration, generateGenerationId, getActiveGenerationId
messages.ts     → list, send
lifecycle.ts    → create, remove          (JS reserved word blocks `delete`)
generation.ts   → abort
pinned.ts       → toggle
followUps.ts    → get, save
list.ts         → get                     (thread-list query)
helpers.ts      → shared internals
shared.ts       → validators (vAttachment, vListThreadReturn, vListThreadStreams, vEnrichedMessage, vPublicFile)
```

API paths: `api.ai.thread.lifecycle.create`, `api.ai.thread.messages.send`,
`api.ai.thread.pinned.toggle`, etc.

## Wave 3–relevant deltas from Wave 2

### `lifecycle.create` is now a direct DB insert

No `agent.createThread` call, no mutation→mutation hop. Current shape:

```ts
await ctx.db.insert("threads", { ...fields });
```

Phase 3b (clientId on create) plugs cleanly into this — add the validator
arg, include `clientId` in the insert object.

### Agent runtime relocated out of `src/`

`packages/db/src/agent/client/` → `packages/db/lib/agent-client/`. Moved so
Convex codegen doesn't scan it (it broke type cycles). All runtime helpers
(`saveMessage`, `listMessages`, `syncStreams`, `Agent` class) live there.
Import from `../../lib/agent-client` (or `../lib/agent-client` etc.) — not
from the old `src/agent/client` path.

### `agent` singleton is module-local

In `packages/db/src/ai/agents.ts`, the `agent = new Agent(...)` is no longer
exported. Wave 3 shouldn't need it — but if you do, either import it via a
non-scanned module or use the raw helpers from `lib/agent-client` directly.

### Pattern: scanned exports that call `internal.*` must pin their return type

Convex codegen types flow: scanned files → `fullApi` → `internal` →
scanned file return types. If a scanned query/mutation's handler calls
`internal.*`, TS needs a break in the cycle. The pattern we settled on:

1. Declare a validator for the exact return shape in `shared.ts`.
2. Add `returns: vYourThing` to the function definition.
3. In the handler, route the result through a `let result: Infer<typeof vYourThing>;`
   (no initializer) so the inferred handler return is pinned to the
   validator, not to a shape that walks back through `internal.*`.

See `list` in `ai/thread/messages.ts` for the reference implementation.
If Phase 3b or 3c adds new scanned queries/mutations that call `internal.*`,
follow this pattern. Do **not** add explicit return-type annotations
(banned by `no-restricted-syntax`).

### `list` query `numItems === 0` short-circuit

The `list` query in `ai/thread/messages.ts` short-circuits when
`paginationOpts.numItems === 0` and returns an empty page directly
(skipping the `internal.agent.messages.listMessagesByThreadId` hop).
Convex's `.paginate` rejects `{ cursor: null, numItems: 0 }`, and the UI
sends that shape during initial mount. If Phase 3c restructures this
query, preserve the guard.

### Pipeline (unchanged, still load-bearing)

- `streamResponse` requires `generationId`. `wasAborted` check before
  `clearForGeneration` so follow-ups distinguish natural completion vs abort.
- `agent_working` emits from `onChunk` on first chunk of any kind.
- `response_streaming` emits on first text-delta.
- `callSettings: { maxRetries: 0 }` in `agents.ts` — SDK retry-replay
  disabled so it can't re-stream after a user abort. Don't raise without
  gating retries on `wasAborted` returning false.

---

## Load-bearing gotchas (don't break these)

- **`callSettings: { maxRetries: 0 }`** in `agents.ts` (above).
- **Delta streamer batches at 100 ms OR 10 parts**, first delta immediate.
  Tunable via `StreamingOptions.throttleMs` / `.maxPartsPerFlush`.
- **Keep `streamingMessages.state` and `messages.status`.** Different
  concepts from the deleted `threads.state` — these are per-stream and
  per-message, load-bearing for the agent runtime.
- **`generationFnId` on `threads` is kept** (decoupled from state). Used
  by `generation.abort` to `ctx.scheduler.cancel(...)` a pending
  `streamResponse` before it calls the LLM.
- **Event-emit guard.** `emitThreadEvent` no-ops on non-user events if no
  row exists for the generationId. Prevents abort-vs-emit races from
  resurrecting a cleared cycle.

---

## Schema field additions / removals

Convex `schemaValidation` rejects schema-push when existing rows carry a
now-removed field. Workflow for Phase 3b (adding `clientId`):

- Adding a field: make it `v.optional(...)` or backfill before making
  required. Existing rows won't have it.
- Removing a field (not needed in Wave 3 but for reference): write an
  internal mutation to unset → deploy with field still in schema → run
  mutation in all envs → drop field in follow-up push.

Wave 3 open question Q7 is already decided by this workflow: new
`clientId` field starts `v.optional`, existing rows stay null.

---

## Phase 3a shipped — context for 3b/3c

- Phase 3a step 1 (delete 3s `setTimeout` in `composer-send.tsx`) was
  already done before 3a started — Wave 2's event-derived state removed
  the flash the timeout was hiding. File is clean.
- Phase 3a step 2 was **not** implemented as a local pending flag. User
  rejected that approach. Instead, the optimistic Convex update on
  `api.ai.thread.messages.send` also writes `"user_message_sent"` to
  `threadQueries.state(threadId)` via `store.setQuery`, and the
  optimistic update on `api.ai.thread.generation.abort` clears it to
  `null`. The send button flips to abort-mode on the next frame,
  driven entirely by the existing state query. Both live in
  `packages/features/src/thread/hooks/use-thread-mutation.ts`.
- `abortGeneration` was switched from `useTanstackMutation` to Convex's
  native `useMutation` (needed for `.withOptimisticUpdate`). Error
  toast kept via a local `.catch`. Phase 3c will move the optimistic
  logic into `threadMutations.*` in `lib/mutations.ts` — preserve the
  `store.setQuery(state.get, { threadId }, ...)` calls when migrating.

## Phase 3b decisions (from user, 2026-04-20)

- **Q3 UUID**: reuse `randomUUID()` at
  `packages/features/src/messages/agent/optimisticallySendMessage.ts:101`.
- **Q4 route shape**: single `/chat/$id`, loader disambiguates clientId
  vs server `_id`.
- **Q5 URL**: while the user is on the composer page, URL stays on the
  clientId. Once they navigate away and come back via the thread list,
  use the server `_id`. Implication: thread-list entries link to the
  real `_id`, not the clientId. Do not `router.replace` the URL while
  the user is actively on the thread.
- **Q7 backfill**: new `clientId` is `v.optional`. Existing rows stay
  null. No backfill.
- **Q8 abort during optimistic window**: abort must work from the next
  frame after send. Clicking stop before `createThread` resolves must
  behave as if the user aborted post-stream-start. Non-trivial — the
  thread doesn't exist server-side yet. Options to consider: queue the
  abort locally and fire it once `createThread` resolves; or send
  abort with clientId and have the server resolve clientId → threadId.
- **Q9 create failure**: stay on the URL, show a retry UI.

Still open for 3b: Q6 (keep clientId on row forever — default yes,
disk-cheap).

## Parked (still outstanding after Wave 2)

- **Mid-generation delete.** `lifecycle.remove` on a non-idle thread
  throws today. Plan: inline abort logic instead of throwing. Pull abort
  body from `generation.ts` into a shared helper so both paths call it.
  Not part of Wave 3 unless the optimistic-UX work surfaces it.
- **Potential Wave 5: merge `/ai/` and `/agent/` folders.** Parallel
  structure still present. Post–agent-client relocation the friction is
  lower, but not merged. Separate wave discussion.

---

## Validation after each step

`pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`. Manual
browser test the feature you changed before calling a phase done.
