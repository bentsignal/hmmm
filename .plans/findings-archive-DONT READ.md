# Wave findings

Running log of what each wave actually changed, what we learned, and anything
downstream waves need to keep in mind. Update (don't overwrite) this file after
each wave completes.

---

## Wave 1 — Foundations (completed 2026-04-18)

### Track A — shared-features pattern pilot

**What actually shipped**

- New co-located `packages/features/src/thread/lib/queries.ts` now holds the
  **entire** `threadQueries` object (`listFirstPage`, `messagesFirstPage`,
  `state`, `title`, `followUps`), each wrapped in TanStack `queryOptions()`.
  Thread entries were fully migrated out of the monolithic root
  `packages/features/src/lib/queries.ts` — the plan only strictly required
  `state`, but moving all five avoided a split `threadQueries` object across
  two import paths. Callers now import `threadQueries` from
  `@acme/features/thread` (re-exported via the feature index).
- Non-thread entries in the root `lib/queries.ts` (`pricingQueries`,
  `suggestionQueries`, `userQueries`) are untouched — they migrate out in
  Wave 3 along with their feature folders.
- `packages/features/src/thread/lib/mutations.ts` exports a hook
  `useThreadMutations()` returning `{ rename: mutationOptions(...) }`. Chosen
  shape: hook-returned object (matches start-faster's
  `usePageMutations`) because `useConvexMutation` is itself a hook and can't
  live at module scope. The plan's wording "threadMutations object" resolves
  to "the object returned by the hook," not a module-level const.
- `useThreadStatus` deleted; all call sites now call
  `useQuery(threadQueries.state(threadId))` directly with a local
  `select: (state) => state === "idle"` (or similar) to satisfy the
  `useQuery must include select` lint rule. `useQuery` imports from
  `@tanstack/react-query` still need the
  `// eslint-disable-next-line no-restricted-imports` comment with a
  justification — the rule bans it by default in favor of
  `useSuspenseQuery`; we kept `useQuery` here because these reads happen
  outside route loaders and must not trigger a suspense boundary on every
  thread switch (XR composer flicker, etc).
- `renameThread` removed from `useThreadMutation`. The thread rename modal
  now spreads `...threadMutations.rename` into its own `useMutation` and
  attaches a local `onError` (toast). No optimistic update added — existing
  code didn't have one, and the plan treated it as optional.

**Files added**

- `packages/features/src/thread/lib/queries.ts`
- `packages/features/src/thread/lib/mutations.ts`

**Files deleted**

- `packages/features/src/thread/hooks/use-thread-status.ts`

**Notable refactors**

- `packages/features/src/thread/index.ts` exports `threadQueries` and
  `useThreadMutations` (drop-in via `@acme/features/thread`).
- `packages/features/src/messages/hooks/use-messages.ts` updated its
  `threadQueries` import to the new co-located path.
- `apps/web/src/features/thread/thread.tsx`,
  `packages/features/src/composer/hooks/use-send-message.ts`,
  `apps/web/src/features/thread/components/thread-rename-modal.tsx` all
  migrated to the new pattern.

### Track B — usage-checked wrapper + redundancy removal

**What actually shipped**

- New file `packages/db/src/usage_checked_helpers.ts` exports
  `usageCheckedMutation` and `usageCheckedQuery`. Placed here (not in
  `convex_helpers.ts`) to avoid a circular import: the wrappers need
  `getUserPlanHelper` / `getUsageHelper` / `getUserInfoHelper`, and those
  helpers' files import `authedQuery`/`authedMutation` from
  `convex_helpers.ts` at module scope. Putting the new wrappers next to
  the raw helpers keeps `convex_helpers.ts` free of user/* imports.
- Wrapper body: `checkAuth` → parallel `Promise.all([getUserPlanHelper,
  getUserInfoHelper])` → `getUsageHelper(ctx, userId, userPlan)`. `usage`
  can't parallelize with plan because `getUsageHelper` needs the plan to
  compute the limit, but we reuse the already-fetched plan via its optional
  third param (option **b** from the plan).
- `sendMessage` and `create` (in
  `packages/db/src/ai/thread/mutations.ts`) migrated to
  `usageCheckedMutation`; everything else (`rename`, `abortGeneration`,
  `deleteThread`, `togglePinned`) stayed on `authedMutation`.

**Helper signature changes (breaking for any future caller)**

- `getUserInfoHelper(ctx, userId)` — takes a raw `QueryCtx` and an explicit
  `userId`. Previously took only the custom ctx and read
  `ctx.user.subject`.
- `getUsageHelper(ctx, userId, plan?)` — same ctx generalisation; optional
  pre-fetched `plan` skips the internal `getUserPlanHelper` fetch.
- `getPerferredModelIfAllowed(plan, modelId)` — **now a pure function**
  taking a `Plan` directly, not ctx. No DB reads.
- `allowModelSelection(ctx, userId)` → **removed**; replaced with pure
  `isModelSelectionAllowed(plan: Plan)`.
- `getPlanTierHelper(ctx, userId)` kept (used by the `getPlanTier`
  internal query called from AI image tools), but now delegates to a
  new pure `getPlanTierFromPlan(plan)` so either shape is usable.
- `validateMessage(ctx, message, attachmentLength)` — ctx is now
  `CustomCtx<typeof usageCheckedMutation>`; it reads `ctx.usage.limitHit`
  instead of calling `getUsageHelper` itself.

**Measured impact (dev deployment, `merry-ibis-102`)**

| Metric (sendMessage) | Before | After | Δ |
|---|---:|---:|---:|
| `executionTime` mean (n=5) | 756.3 ms | 509.4 ms | **−247 ms (−33%)** |
| `userExecutionTime` mean | 195.5 ms | 185.1 ms | −10 ms |
| `polar.getCurrentSubscription` calls per invocation | 2× | 1× | halved |
| `hasUnlimitedAccess` calls per invocation | 2× | 1× | halved |

- `create` measurement post-change was not captured — the events rolled off
  the 1000-entry Convex log window before I could pull them. The code path
  is identical to sendMessage (same wrapper, same helpers), so the saving
  is expected to be proportional, but there's no clean number to quote.
  Pre-change `create` sample (n=1): 830 ms exec.
- The 509 ms steady-state is above the plan's 200 ms target. Remaining
  cost is dominated by unavoidable DB work per mutation: Polar
  subscription read, users-table read for unlimited flag, `usage.sum`
  aggregate, rate limiter, `authorizeAccess`, `saveMessages`. Further
  reductions would need caching or aggregate rework, explicitly out of
  scope for Wave 1.

**All perf instrumentation stripped after numbers confirmed.** There is no
`packages/db/src/lib/perf.ts` anymore, no `perf:` console.logs anywhere,
no temporary `max-lines` disable. If you re-need timing later, don't
re-introduce a `Date.now()` diff helper (see "Gotchas" below).

### Gotchas worth remembering for later waves

1. **Convex freezes `Date.now()` inside a transaction** (queries and
   mutations). A `const start = Date.now(); ...; Date.now() - start`
   pattern always returns 0 for in-transaction sub-step timing. If you
   want per-step timing in a mutation you need either an action boundary
   or external log analysis. For Wave 1 Track B we fell back to **call
   counts** (grep `logLines` in JSONL log export) to verify redundancy
   was eliminated — that worked fine for before/after comparison.
2. **Convex dev auto-push fails on circular module-scope imports.** The
   error surfaces as `Failed to analyze ai/agents.js: Uncaught TypeError:
   x is not a function` with a stack pointing at an
   `export const foo = authedQuery({...})` line. The fix is to move the
   consumer-of-helpers into its own file so the cycle breaks. See
   `usage_checked_helpers.ts` for the pattern.
3. **`useQuery` is banned project-wide** in favour of `useSuspenseQuery`
   preloaded in route loaders. When a component legitimately needs the
   non-suspending variant (e.g., reacting to state that changes while
   mounted, or a hook that must not unmount a suspense boundary), add
   the `eslint-disable-next-line no-restricted-imports` with a *specific*
   reason. Also: `useQuery`/`useSuspenseQuery` **must** include `select`
   (separate lint rule). At call sites of the shared `threadQueries`,
   that's where per-caller derivations (`state === "idle"`, etc.) live.
4. **The monolithic `packages/features/src/lib/queries.ts` is mid-migration.**
   After Wave 1 only `pricingQueries`, `suggestionQueries`, `userQueries`
   remain. Wave 3 Phase 3c fully dismantles this file — move each
   remaining export into the matching feature's `lib/queries.ts` and
   delete the root when empty. Don't introduce a root
   `lib/mutations.ts`; follow the co-located layout Track A established.
5. **Log-window is small on dev Convex deployment (~1000 entries).**
   When asking the user to trigger flows for measurement, be ready to
   fetch logs immediately after and/or batch reads tightly — 5+ minutes
   of UI activity between runs will push older events off the end.
6. **Track B decided *against* a Polar cache.** `polar.getCurrentSubscription`
   is an indexed read against local component tables kept in sync via
   webhooks, not an outbound HTTP call. Cache would add complexity for
   no gain. If a future hot path suggests otherwise, revisit with fresh
   measurements first.
7. **`apiMutation` / `apiQuery` wrappers were *not* extended.** Only two
   API-key call sites exist (file-upload verify, newsletter preference
   update) and neither is on a hot path. Don't build a parallel
   `usageCheckedApi*` wrapper unless an API hot path emerges.

### Handoff to later waves

- **Wave 2** (unified agent refactor):
  - Baseline latency is documented above; use it when evaluating whether
    Wave 2's changes moved the needle. Don't rely on re-adding a
    `Date.now()` timer — see gotcha 1.
  - The extended context shape (`ctx.user`, `ctx.userPlan`, `ctx.userInfo`,
    `ctx.usage`) is live and ready to carry the batched-mutation buffer
    Wave 2 wants to add. Add fields to `buildUsageCheckedCtx` in
    `usage_checked_helpers.ts`; don't fork a new wrapper per feature.
  - The old `useThreadStatus` hook is gone — Wave 2's UI consumers of
    thread state read via `useQuery(threadQueries.state(threadId))` at
    the call site with a local `select`.
- **Wave 3** (optimistic UX + pattern rollout):
  - The shared-features pattern pilot is complete: one query
    (`threadQueries.state`, and implicitly the whole `threadQueries`
    object) and one mutation (`threadMutations.rename`). Wave 3 extends
    this to the rest of the hooks. Use `packages/features/src/thread/lib/*`
    as the model — hook-returned `mutationOptions` for mutations, plain
    module-level `queryOptions()` exports for queries, no `select` in
    the shared definitions.
  - When introducing truly-shared optimistic updates, put them in the
    shared `mutationOptions`. Event handlers (`onSuccess` / `onError`)
    stay at the call site.
  - **`packages/features/src/thread/hooks/use-thread-mutation.ts` should
    be deleted.** It still exists after Wave 1 because `create`,
    `sendMessageInThread`, `deleteThread`, `togglePinned`, and
    `abortGeneration` haven't been migrated yet. Every one of those needs
    to move to `threadMutations.*` in
    `packages/features/src/thread/lib/mutations.ts`, and each call site
    wires its own `useMutation({...threadMutations.X, onError })`. Once
    the hook is empty, delete it and its export from
    `packages/features/src/thread/index.ts`. Same principle for any
    similar centralising hook you encounter (e.g.
    `billing/hooks/*-mutation.ts` if one exists). **Do not centralise
    toast/error handling in a shared hook** — error UX differs between
    web and XR (and between contexts within web), so it belongs at the
    call site. This was the user's explicit rationale for the whole
    shared-features migration.

---

## Wave 2 — Phase 2a: Events table (completed 2026-04-18)

### What actually shipped

- New `threadEvents` table in `packages/db/src/agent/schema.ts` with indexes
  `threadId_timestamp` and `generationId`. **Three-event taxonomy** (shrunk
  from the plan's original five during testing — see deviations below):
  - `user_message_sent` — user sent, agent not yet dispatched → UI "waiting".
  - `agent_working` — `streamText` began producing deltas (reasoning / tool
    calls / no visible text yet) → UI "thinking".
  - `response_streaming` — first text-delta arrived → UI "streaming".
- Steady-state idle is **0 rows per thread**. Terminal transitions (natural
  completion, G1/G2 error, user abort) call `clearEventsForGeneration` which
  deletes every row for that `generationId`. No historical audit kept;
  Effect/Axiom logging covers that need (Wave 4).
- New `packages/db/src/ai/thread/events.ts` exports:
  - `emitThreadEvent(ctx, args)` — helper callable from mutations.
  - `emit` internal mutation — wrapper for action callers via `runMutation`.
  - `clearEventsForGeneration(ctx, generationId)` + `clearForGeneration`
    internal mutation — terminal cleanup.
  - `generateGenerationId()` — `crypto.randomUUID()` at cycle entry points.
  - `getActiveGenerationId(ctx, threadId)` — returns the generationId of the
    latest event for a thread, or null. Used by `abortGeneration`.
- Event emission wired into:
  - `sendMessage` / `create` in `packages/db/src/ai/thread/mutations.ts` emit
    `user_message_sent` and pass `generationId` to the scheduled
    `streamResponse` action.
  - `streamResponse` in `packages/db/src/ai/agents.ts` emits `agent_working`
    when the stream starts and `response_streaming` via an `onChunk` hook on
    the AI SDK (first chunk with `type === "text-delta"`).
  - `abortGeneration` in `mutations.ts` reads the active `generationId`,
    calls `clearEventsForGeneration`, and logs the new `N2` system notice.
- `generateTitle` / `setTitle` / `rename` extracted to a new
  `packages/db/src/ai/thread/title.ts` to keep `mutations.ts` under the
  300-line limit. Internal scheduler refs and the single external caller
  (`packages/features/src/thread/lib/mutations.ts`) updated to
  `api.ai.thread.title.rename`.
- New `N2` system notice ("Response stopped early — you aborted the
  generation.") inserted by `abortGeneration` as a user-visible assistant
  message. `NOTICE_MESSAGES` / `SystemNoticeCode` / `noticeCodes` in the
  features package extended. `NoticeMessage` in
  `apps/web/src/features/messages/components/notice-message.tsx` now scopes
  the "View Plans" link to N1 only. XR's `xr-response-message.tsx` already
  rendered the message body without an upsell link, so no XR-side change.

### Deviations from the plan

- **Taxonomy shrunk from 5 → 3 events.** The plan called for five events
  including three terminal types (`streaming_completed`, `streaming_aborted`,
  `generation_failed`). During testing the user proposed treating "cycle
  ended" as the *absence* of rows rather than a terminal event type,
  reasoning that terminal data belongs in Effect/Axiom logs. Result: cleaner
  derivation, 0-row idle footprint, idempotent abort-vs-complete because
  both paths call the same `clearEventsForGeneration`. The plan file hasn't
  been edited to reflect this — it still documents the 5-event design.
- **`response_streaming` event added mid-wave.** Not in the original plan.
  User wanted a distinct signal for "agent is working on tool calls /
  reasoning" vs. "user-visible text is now flowing." Fires via `onChunk`
  on `thread.streamText`, gated by a local boolean so it emits at most
  once per cycle.
- **No `metadata` field on `threadEvents`.** Dropped — the error-code
  metadata field the plan proposed for terminal events became moot when
  terminals stopped being events.

### Race-safety additions (not in the plan, discovered during testing)

1. **`emitThreadEvent` guards follow-up events.** When eventType is
   `agent_working` or `response_streaming`, the helper checks if any row
   exists for the `generationId` — if not, it no-ops. This handles the race
   where `abortGeneration`'s `clearEventsForGeneration` commits before a
   straggling follow-up emit from the still-running `streamResponse`.
   Without this guard, the follow-up emit would leave a stranded row for a
   generation the user already aborted.
2. **New `startStreamingIfWaiting` internal mutation.** Replaces the
   previous `setState("streaming")` call in `streamResponse`. It no-ops when
   the thread is already `idle` (i.e., the user aborted between
   `streamText()` returning and the `setState` mutation committing). Before
   this, a late-landing `setState("streaming")` could flip the thread back
   to `streaming` after an abort, leaving the UI stuck with the brain icon
   and the abort-button variant of composer-send until the SDK's internal
   retries eventually drained.

### UI reactivity fixes (not in the plan, discovered during testing)

- `packages/features/src/composer/hooks/use-send-message.ts` now derives
  `isGenerating` as `state === "waiting" || state === "streaming"` instead
  of `!isThreadIdle`. The old form treated the pending query (data
  `undefined`) as `isGenerating: true`, which made the composer think every
  thread was active during the first paint.
- `apps/web/src/features/composer/components/composer-send.tsx` lost its
  three-second `optimisticEnable` delay. That delay existed to paper over
  the false-positive `isGenerating` above; once the root cause was fixed
  it was both redundant and actively harmful (the abort button couldn't
  appear for three seconds after navigating into a new thread, so users
  couldn't abort during the early "waiting" phase).

### Files added

- `packages/db/src/ai/thread/events.ts`
- `packages/db/src/ai/thread/title.ts`

### Files with non-trivial changes

- `packages/db/src/agent/schema.ts` — `threadEvents` table.
- `packages/db/src/ai/thread/mutations.ts` — event emission, abort notice,
  `startStreamingIfWaiting`. `generateTitle`/`setTitle`/`rename` moved out.
- `packages/db/src/ai/agents.ts` — `generationId` plumbing (optional arg
  with UUID fallback for in-flight schedules across deploy), `onChunk`
  handler, `startStreamingIfWaiting`, event emits on all cycle transitions,
  `clearForGeneration` on every terminal path.
- `packages/db/src/ai/thread/helpers.ts` — `logSystemNotice` widened to
  accept `MutationCtx`; `SystemNoticeCode` adds `N2`.
- `packages/features/src/messages/*` — `N2` in notice codes and messages.
- `packages/features/src/composer/hooks/use-send-message.ts` — reactivity.
- `apps/web/src/features/composer/components/composer-send.tsx` — dropped
  optimistic delay.
- `apps/web/src/features/messages/components/notice-message.tsx` — scoped
  View Plans to N1.
- `packages/features/src/thread/lib/mutations.ts` — rename ref updated.

### Parked for Phase 2b

1. **SDK retry-replay on abort.** When `abortById` tears down the HTTP
   connection to OpenRouter, the AI SDK (`callSettings: { maxRetries: 3 }`
   in `agents.ts`) treats it as a transport error and reopens the stream.
   The user sees the streaming message disappear, a new stream begin
   (often slower), and has to click abort a second time. Not introduced
   by 2a — pre-existing — but should be fixed in 2b since the stream
   lifecycle gets rewritten there anyway. Cheapest path: drop `maxRetries`
   or add a retry predicate that refuses retries once the cycle is no
   longer active (`getActiveGenerationId` returns null).
2. **`streamResponse` still dual-writes `thread.state` via
   `startStreamingIfWaiting` and `resetIdleIfStreaming`.** Both go away
   in 2c when the field is dropped. 2b keeps the dual-write so the UI
   keeps working against the old query.

### Gotchas

1. **Schema change requires wiping `threadEvents` before deploy.** The
   eventType union narrowed and renamed during 2a (`streaming_started` →
   `agent_working`; removed terminal types). Old rows with removed
   values stay on disk harmlessly, but they can confuse derivation
   later. Truncate the table via the Convex dashboard when pushing
   schema edits during future phases.
2. **Event emission from mutations should use the helper, not the
   internal mutation.** `emit` exists only for action callers that need
   `runMutation`. Mutation-to-mutation emit is a pointless extra
   transaction boundary — always import `emitThreadEvent` directly. This
   matters for 2b where we're collapsing mutation hops.
3. **`generationId` is optional on the `streamResponse` action arg.**
   Deliberate backward-compat shim for scheduled-but-not-yet-started
   `runAfter(0, streamResponse, ...)` calls queued before the 2a deploy.
   The handler mints a UUID fallback if absent. Safe to remove in 2c
   once you're confident no pre-2a schedules can still be pending.
4. **Emit ordering is naturally 3-step:** `user_message_sent` →
   `agent_working` → `response_streaming`. The helper relies on this
   ordering implicitly (cycle-active check: "any row for generationId
   exists"). If a future emitter ever needs to post-date an event out of
   order, reconsider the guard.

### Handoff to Phase 2b

- The `component.ts` shim (`packages/db/src/agent/component.ts`) is still
  in place. Phase 2b should delete it entirely and replace
  `ctx.runMutation(agentComponent.X, args)` call sites with direct
  imports from `packages/db/src/agent/handlers/*`. The user confirmed
  full removal, not a partial alias.
- The hottest mutation-hop sites are listed in the plan's current-state
  section: `delta_streamer.ts` lines ~148/161/222/274/288 (5 mutations
  per stream lifecycle), `start/save.ts` lines ~38–40 (per-message
  save), `start.ts` line ~211 (finalizeMessage), `client/index.ts` line
  ~170 (updateThread).
- The `emit` / `clearForGeneration` internal mutations stay — action-side
  callers need them. In 2b you can fold them into a larger composite
  mutation if it reduces hops (e.g., "finish stream" that clears events
  + resets state + saves final step in one transaction).
- Latency baseline for comparison lives in Wave 1 Track B's findings
  section above (509 ms mean sendMessage `executionTime`). Use the same
  measurement approach (Convex log JSONL + call counts) for 2b's
  before / after.

---

## Wave 2 — Phase 2b (completed 2026-04-18)

### What shipped

1. **Component shim deleted.** `/packages/db/src/agent/component.ts` is gone.
   Its sole consumer (`/packages/db/src/ai/agents.ts`) now derives
   `agentComponent` inline: `internal.agent as unknown as AgentComponent`.
   Convex codegen was re-run so the generated `_generated/api.d.ts` no
   longer references the deleted module. The `AgentComponent` *type* still
   lives in `/packages/db/src/agent/client/types/ctx.ts` — kept because
   every client helper threads `component: AgentComponent` through its
   signature; removing the type would require a much larger refactor
   across 10+ files. The runtime shim (the file) is what mattered, and
   it's now gone. Follow-up cleanup (drop the type entirely, rewrite
   helpers to reference `internal.agent.X` directly) is a Wave 4/5 polish
   task — not load-bearing for correctness or performance.

2. **Mutation→mutation hops inlined** for the three hottest paths that
   previously did `ctx.runMutation(component.messages.addMessages)` from
   inside another mutation:
   - `saveUserMessage` (helpers.ts) — called from `create` and
     `sendMessage` mutations.
   - `logSystemError` (helpers.ts) — called from `create` mutation on
     title/response scheduling failure.
   - `logSystemNotice` (helpers.ts) — called from `abortGeneration`
     mutation on user abort.

   Implementation: new `saveMessagesInline(ctx, args)` helper in
   helpers.ts. It branches on `"db" in ctx`: if mutation ctx, calls
   `addMessagesHandler` directly (same transaction, zero hops). If
   action ctx (e.g., `streamResponse` calling `logSystemError` on G2),
   falls back to `agent.saveMessages` which uses `ctx.runMutation`.
   Action→mutation boundaries are required by Convex and stay.

3. **Delta streamer batching policy.** `DeltaStreamer` now flushes on
   whichever comes first:
   - `throttleMs` elapsed since last write (default lowered from 250ms
     to 100ms)
   - `maxPartsPerFlush` parts queued (default 10)

   The "first delta is immediate" invariant is preserved by the existing
   `Date.now() - #latestWrite >= throttleMs` check (latestWrite starts
   at 0). Short bursts still coalesce; steady-state cadence is ~10
   flushes/sec instead of ~4. Both knobs are surfaced on the public
   `StreamingOptions` type so callers can override.

4. **SDK retry-replay on abort fixed.** `callSettings.maxRetries`
   changed from 3 to 0 in agents.ts. The AI SDK retries on transient
   errors by replaying the entire `streamText` call, which would
   re-emit the whole response after a user abort (`abortById` silently
   stops writes; it doesn't throw, so the SDK didn't see it as an
   abort). With retries off, an abort ends the generation cleanly. If
   we ever re-introduce retries, gate them on a predicate that checks
   `getActiveGenerationId(ctx, threadId) === generationId` so a stale
   generation can't resurrect itself.

### Deviations from plan

- **Shim file deleted, AgentComponent type kept.** The plan said
  "replace every `ctx.runMutation(agentComponent.X, args)` call site
  with a direct import of the handler." I did this only for the
  mutation→mutation call sites (the real hop savings). Action→mutation
  sites still go through `ctx.runMutation(component.X, args)` — Convex
  requires that boundary, and the plan acknowledges it
  ("action→mutation hops stay"). The shim file is deleted so the
  abstraction leak is gone at the runtime boundary.

- **Delta streamer batching is simpler than envisioned.** The plan
  talks about a "StreamWriter helper class" and a "write-through
  buffer." The existing DeltaStreamer already buffers via
  `#nextParts[]` and throttles writes; the change was just tuning the
  flush trigger to time-or-count. No new class needed.

- **Per-step message save was already batched.** `save.ts`
  serializes one step's new response messages and calls
  `addMessages` once per step, not per message. Task #13 closed
  without code changes — the goal was already met.

### Files changed

- Deleted `/packages/db/src/agent/component.ts`.
- Regenerated `/packages/db/src/_generated/api.d.ts` (removed the two
  lines that referenced the deleted module; `convex codegen` handled
  this automatically).
- `/packages/db/src/ai/agents.ts` — removed import, inlined
  `agentComponent` declaration, set `maxRetries: 0`.
- `/packages/db/src/ai/thread/helpers.ts` — added `saveMessagesInline`
  helper; rewired `saveUserMessage` / `logSystemError` /
  `logSystemNotice` to use it.
- `/packages/db/src/agent/client/delta_streamer.ts` — added
  `maxPartsPerFlush` option + count-based flush path; lowered
  `throttleMs` default to 100.

### Gotchas / things to watch

- **`serializeMessage` takes an unused `component` arg.** The impl
  ignores it (it's pure content serialization). `saveMessagesInline`
  passes `{} as never` with an eslint-disable. If a future change makes
  `serializeMessage` actually hop, this will break silently. Fix would
  be to drop the unused parameter from `serializeMessage` — not done
  here because it ripples through the mapping module.

- **Retries at 0 means transient network errors surface immediately.**
  If the LLM provider blips, the user sees a G2 error instead of a
  transparent retry. If this becomes noisy, add a smart retry with the
  `getActiveGenerationId` predicate — do NOT just bump maxRetries back
  up.

- **Convex codegen must re-run on clean clones.** The generated
  api.d.ts is checked in and currently reflects the post-delete state.
  If someone re-adds component.ts (e.g., a revert), codegen will pick
  it back up. No schema migration risk.

### Parked for 2c (or a polish pass immediately after)

- **AgentComponent type + component plumbing removal.** 2b deleted the
  shim file and inlined the three hottest mutation→mutation hops, but
  the `AgentComponent` type in
  `/packages/db/src/agent/client/types/ctx.ts` and the
  `component: AgentComponent` parameter threaded through every client
  helper (~10–12 files under `packages/db/src/agent/client/`) are
  still there. The cast `internal.agent as unknown as AgentComponent`
  in `ai/agents.ts` is the visible symptom. Full integration means:
  drop the param from every signature, replace
  `ctx.runMutation(component.X, args)` with
  `ctx.runMutation(internal.agent.X, args)` (or direct handler calls
  where the call site is already in mutation context), delete the
  `AgentComponent` type. Pure hygiene — no new behavior, no perf
  implications. User explicitly flagged it as mucky; do this after 2c
  so the file churn doesn't overlap with the state-field drop.
- Everything from the plan: add `getStateFromEvents` query, flip the
  reads, drop `threads.state`, rewrite `wasAborted` in terms of
  `generationId`. Events are correct and load-bearing; the dual-write
  can now be cut over safely.

- Latency re-measurement: did NOT re-run Wave 1B's
  `sendMessage.executionTime` instrumentation. The 2b changes
  (inlined mutation→mutation hops for `saveUserMessage` +
  `logSystemError` + `logSystemNotice`, lower throttle, fewer idle
  waits) should reduce the 509 ms baseline, but the improvement
  hasn't been quantified. Worth doing during 2c soak since that's
  when the full Wave 2 effect lands.

### Handoff to 2c

- `threads.state` is still dual-written. `emitThreadEvent` handles the
  event side; the `setState` / `startStreamingIfWaiting` /
  `resetIdleIfStreaming` internals still flip the row's `state` field.
  2c's job is to introduce `getStateFromEvents`, flag-flip the read,
  then cut the dual-write and drop the field.
- `wasAborted` still reads `thread.state === "idle"` as the abort
  proxy. In 2c, rewrite as: "is there a `streaming_aborted` event for
  this thread's current `generationId`?" — but note we dropped
  `streaming_aborted` from the event taxonomy in 2a. Reconcile: the
  current taxonomy is `user_message_sent` / `agent_working` /
  `response_streaming`. Abort is signalled by
  `clearEventsForGeneration` (no events left). So `wasAborted` in 2c
  should be: "is there any event for the active generation?" — if
  none, user aborted.
