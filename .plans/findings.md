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
