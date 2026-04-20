# Wave 3 — Optimistic UX + Finish Shared-Features Rework

> **Status:** Not started.
> **Estimated effort:** ~1 week.
> **Prerequisite:** Wave 1 Track A (the shared-features pattern pilot) and Wave 2 (events table + state derivation) should be done first. The pilot pattern is what we extend in Phase 3c. The events refactor is what makes the abort-button delay fix in Phase 3a possible without regressing the original false-positive-flash bug that the 3-second timeout was patching over.

---

## What this wave merges

This wave intentionally fuses two of the original six initiatives:

1. **"Better optimistic updates"** (https://www.notion.so/3453b59a4f9c80208672d9ecff5e04ad) — instant abort button, instant new-thread navigation, generally instant feel.
2. **The remainder of "Updates to shared features"** (https://www.notion.so/3463b59a4f9c806d9048d0093f51b3cd) — apply the Wave 1 Track A pilot pattern to the rest of the hooks in `packages/features`.

### Why merged (recap from planning conversation)

Both research subagents independently flagged this. The user's own Notion notes for "Updates to shared features" said:

> in use page mutations, you could write the optimistic updates for convex in that file. And those can be shared across the app.

So the new shared-mutation files (built using the start-faster pattern) are the natural home for shared optimistic-update logic. Doing the optimistic-updates initiative without first having the right hook structure means we'd write the optimistic logic in the wrong place and then move it during the features rework. Doing them together is one rewrite instead of two.

---

## Source-of-intent quotes

### From "Better optimistic updates"

> I want my app to feel like every action you take on the client, you get an instant response. So for example, renaming things, deleting things. When you try to create a new thread and you hit enter, I want you to immediately be navigated to the thread view where your message is sent and you see the little loading thing. The new thread is shown immediately in the thread list with like, we'll have the name be like new thread or something and loading. But I just want everything to feel immediate because right now it feels very laggy. When you hit the abort generation button, like nothing happens for a little while, that button doesn't even show up right away for a bit. And I feel like we can just have things be a whole lot better.
>
> The issue with optimistic updates for new threads is that we rely on the convex id of the thread for the page url. So right now we can't really instantly navigate to the new thread because it hasn't been created in the database yet so there's no id. But I think we could probably get around this with some hacks. We could either generate a uuid in the client immediately and then have that be like a temporary id stored in the database and perhaps remove it later in favor of the convex id. We could maybe generate an id and say that it's the convex id and then swap it out when we get the real one. I'm not sure how that would work but I want things to be faster. Everything feels like it takes too long and I want it to feel instantaneous.

### Critical user-memory rule that constrains this wave

> "No useEffect for event-triggered logic — Run follow-ups in the event handler (mutation onSuccess, onClick), not useEffect on the next page."

**Apply this everywhere in this wave.** All the "after thread created, do X" logic must live in the click handler or mutation `onSuccess`, never in a `useEffect` on the destination page. If the agent finds themselves writing a `useEffect` to react to navigation, stop and re-think.

---

## Current state findings (from research subagents)

### Current new-thread flow

- **Trigger files:** `/apps/web/src/app/_authenticated/new.tsx`, `/apps/web/src/app/_authenticated/home.tsx`.
- **Send message hook:** `/packages/features/src/composer/hooks/use-send-message.ts`.
- **Thread mutation hook:** `/packages/features/src/thread/hooks/use-thread-mutation.ts`.
- **Backend create:** `/packages/db/src/ai/thread/lifecycle.ts` (the `create` mutation). Path: `api.ai.thread.lifecycle.create`.
- **Sequence today:**
  1. User submits → `useSendMessage()` calls `handleCreateThread()`.
  2. `handleCreateThread()` calls `createThread()` mutation, **awaits** the result.
  3. Backend creates thread, returns `threadId`.
  4. Mutation `onSuccess` calls `navigateToThread(threadId)`.
  5. Page loads at `/chat/$id`, router loader fires 4 parallel queries.
  6. Only **then** is the thread visible.
- **Result today:** non-instant. ~200–500ms+ before navigation.

### Current optimistic update mechanics

- **Message-level optimism exists:** `/packages/features/src/messages/agent/optimisticallySendMessage.ts` uses Convex `OptimisticLocalStore` + `withOptimisticUpdate()`. Generates client-side UUID for the optimistic message; status `"pending"` until server acks.
- **Thread-level optimism partially exists:**
  - `rename` was migrated in Wave 1 Track A to `threadMutations.rename` in `/packages/features/src/thread/lib/mutations.ts` with a shared optimistic update for the title.
  - `createThread`, `delete`, `togglePinned`, `abort` — all still use raw `useMutation` or TanStack mutations with no optimistic update. Wave 3 adds optimistic behavior and migrates them to `threadMutations.*` in the same file.
  - Thread list (`/packages/features/src/thread/hooks/use-thread-list.ts`) is `useQuery` + `usePaginatedQuery`; no optimistic insert when creating a thread.

### Abort-button delay root cause

- **File:** `/apps/web/src/features/composer/components/composer-send.tsx` (lines ~19–28).
- **Mechanism** (post-Wave-1-Track-A — `useThreadStatus` no longer exists; the component calls `useQuery(threadQueries.state(threadId))` directly, where `threadQueries` lives in `/packages/features/src/thread/lib/queries.ts`):
  1. `useQuery(threadQueries.state(threadId))` returns the server state.
  2. Component derives `isGenerating = latestEvent !== null` locally (query returns `EventType | null`).
  3. **A 3-second `setTimeout` hides the abort button** (`setOptimisticEnable(false)` after 3s).
  4. Button only renders when `isGenerating && !optimisticEnable && activeThread !== null`.
- **Why the timeout exists:** on initial page load, the state briefly reports `"waiting"` before generation actually starts, causing a flash of the abort button. The 3s timeout was a heuristic to suppress the flash.
- **Why this is now fixable cleanly:** after Wave 2, state is derived from events. The "waiting" flash should not happen because we won't see a `streaming_started` event until the stream really starts. We can drop the timeout and replace with a "just-mounted" ref + local pending state.

### Convex client-generated IDs

- The subagent reported that **Convex does not support pre-generated `_id` values in mutations** — the DB generates `_id` on insert. **VERIFY THIS BEFORE PHASE 3B** (5-minute Convex-docs check). The `clientId` field approach is the right design regardless, so this finding doesn't block the work — but worth confirming.

### Hooks remaining for the features rework (rolled over from Wave 1 Track A)

**File layout reminder:** Wave 1 Track A locked in the **co-located per-feature** layout: each feature folder gets its own `lib/queries.ts` and `lib/mutations.ts` (e.g. `/packages/features/src/thread/lib/queries.ts` already exists after Wave 1). The old monolithic root `/packages/features/src/lib/queries.ts` gets dismantled as entries migrate out. Do NOT create a new monolithic root `lib/mutations.ts`.

High priority — query/mutation pairs used in multiple apps:
- `/packages/features/src/thread/hooks/use-thread-list.ts` — embeds select on firstPageQuery. Migrate to `/packages/features/src/thread/lib/queries.ts`.
- `/packages/features/src/thread/hooks/use-thread-mutation.ts` — embeds `onError: () => toast.error()` for delete/togglePinned/abort. **Note:** `rename` was already migrated in Wave 1 Track A (it lives in `/packages/features/src/thread/lib/mutations.ts` as `threadMutations.rename`). This step adds `threadMutations.delete`, `threadMutations.togglePinned`, `threadMutations.abort` to the same file and removes the shared `onError` toast from the hook.
- `/packages/features/src/messages/hooks/use-messages.ts` — embeds `select: (data) => data.page` (strips pagination metadata). Migrate queries to `/packages/features/src/messages/lib/queries.ts`.
- `/packages/features/src/billing/hooks/use-usage.ts` — embeds select picking 5 fields. Migrate to `/packages/features/src/billing/lib/queries.ts`.
- `/packages/features/src/billing/hooks/use-current-plan.ts` — embeds select picking name/price/max. Same file.

Medium priority:
- `/packages/features/src/library/hooks/use-file-mutation.ts` — embeds `onError`. Migrate to `/packages/features/src/library/lib/mutations.ts`.

Lower priority / app-specific:
- `/packages/features/src/composer/hooks/use-send-message.ts` — partially overridable. After Wave 1 Track A it uses `useQuery(threadQueries.state(threadId))` directly rather than `useThreadStatus`. Touch as part of Phase 3a/3b changes.

Plus: dismantle the monolithic `/packages/features/src/lib/queries.ts` — move each entry into its feature's co-located `lib/queries.ts` and wrap with TanStack `queryOptions()` per the Wave 1 Track A pattern. When fully empty, delete it.

---

## Phase 3a — Free wins (~half day)

### Goal

The two cheapest, highest-perceived-impact fixes: instant abort button + instant local pending state on the send button.

### Steps

1. **Delete the 3-second `setTimeout` in `composer-send.tsx`** (lines ~19–28). Replace with:
   - A `useRef<boolean>(true)` for `justMounted`.
   - On first effect, set the ref to `false` after one tick — this is the only place a one-tick effect is OK because it's a mount-time concern, not an event-triggered follow-up.
   - Render abort button when `isGenerating && !justMounted && activeThread !== null`. (`isGenerating` is derived at this call site from `useQuery(threadQueries.state(threadId))` after Wave 1 Track A — no `useThreadStatus` hook anymore.)
2. **Add local pending state in `useSendMessage`** so the send button reacts the moment the user clicks, before any server roundtrip. Merge this local state with the server-derived state read from `useQuery(threadQueries.state(threadId))`.
3. **Verify the false-positive-flash bug from before Wave 2 does not return.** This is why the 3-second timeout existed in the first place. With Wave 2's event-derived state, it should not — but test by:
   - Loading a thread that's actively generating.
   - Loading a thread that just finished generating.
   - Loading a thread that was aborted.
   - Each should land on the correct state immediately, no flash.

### Open questions

- **Q1.** If Wave 2 is NOT yet done (e.g., the user wants to ship Phase 3a first), the false-positive flash will still exist. Should we still proceed with deleting the timeout (and accept a possible flash), or wait? Recommend waiting.
- **Q2.** Should we also remove the abort-on-page-unmount safeguard if any exists? (Not investigated yet — verify no related code is coupled to the 3s timeout.)

### Validation

- Send a message, abort button appears within ~100ms.
- Click send, button immediately shows pending state.
- Reload the page mid-generation; correct state shown immediately, no flash.
- `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`.

---

## Phase 3b — Instant new-thread navigation (~2–3 days)

### Goal

Hitting Enter on the home page immediately navigates to a thread view that shows the user's message and a loading indicator, with the new thread visible in the sidebar list as "new thread / loading".

### Approach

The user's Notion doc enumerated several options. We're picking **option (a) clientId + swap**, with the following rationale:
- Schema-supported (a real `clientId` field is durable, debuggable, and avoids URL-swap jank).
- Composes with the existing route structure rather than introducing an "/_optimistic/" sibling route.
- Follows the no-`useEffect`-for-event-triggers rule cleanly: navigation happens in the click handler synchronously.

### Steps

1. **VERIFY first**: confirm Convex doesn't support pre-generated `_id`s. The subagent claim is unverified. If it turns out Convex does support `Id<"threads">` generated client-side, we can simplify by skipping the `clientId` field and using the same id throughout. (5-minute docs check.)
2. **Schema change**: add `clientId: v.string()` to `threads` table in `/packages/db/src/agent/schema.ts`. Index it for lookup: `index("clientId", ["clientId"])`.
3. **Mutation change**: `create` mutation in `/packages/db/src/ai/thread/lifecycle.ts` accepts `clientId` arg, stores it on the row.
4. **Client change** in `/packages/features/src/composer/hooks/use-send-message.ts`:
   - Generate UUID synchronously in the click handler.
   - Navigate immediately to `/chat/$clientId` (use whatever the route shape is — current routes use `/chat/$id`).
   - Fire the `createThread` mutation in the same handler with the clientId.
   - In mutation `onSuccess`, the URL stays the same (the route resolves clientId → real thread). No second navigation.
5. **Route loader** for `/chat/$id` (current TanStack Router setup, see `routeTree.gen.ts` — DO NOT EDIT generated file; let dev/build regenerate):
   - First check whether the param looks like a UUID (clientId) vs. a Convex `_id`.
   - If clientId: render skeleton + composer immediately; in parallel query thread by clientId.
   - If real `_id`: existing path.
   - When the clientId query returns the real thread (with both clientId and `_id` present), seamlessly hydrate.
6. **Thread list optimism** in `/packages/features/src/thread/hooks/use-thread-list.ts`:
   - On `createThread` mutation, optimistically insert a "new thread (loading)" entry into the list cache using the clientId as the row's id.
   - When the real thread arrives via the live query, the optimistic row gets reconciled.
   - Use Convex's `OptimisticLocalStore` pattern (already used for `optimisticallySendMessage`).
7. **Place all shared optimistic logic in `/packages/features/src/thread/lib/mutations.ts`** (co-located per-feature, same file that already holds `threadMutations.rename` from Wave 1 Track A). Add `threadMutations.create` there with the optimistic update. Per the user's Notion intent: "you could write the optimistic updates for convex in that file. And those can be shared across the app."

### Open questions

- **Q3.** UUID library choice: there's likely an existing one in the repo (the message-level optimistic update uses one). Use the same. Confirm.
- **Q4.** Route shape: `/chat/$id` accepts both clientId and `_id`, OR a separate route segment `/chat/new/$clientId` that swaps to `/chat/$id` once the real id lands? The first is cleaner (no URL change visible to user) but requires the loader to disambiguate. Recommend the first. Confirm.
- **Q5.** Once the real `_id` is known, do we (a) keep the URL as the clientId forever, (b) swap the URL to the real `_id` via `router.replace`, or (c) swap to a slug if we have one? Browser back-button behavior depends on this. Recommend (a) — keep clientId stable, never swap. Simplest UX.
- **Q6.** Should the clientId field be removed from the row eventually (after the swap is "complete")? Or kept forever as an alternate id for analytics / re-load resilience? Recommend keeping forever — disk-cheap, debug-friendly. Confirm.
- **Q7.** Existing threads have no clientId. Backfill, leave null, or auto-generate on read? Recommend leaving null; only new threads get one.
- **Q8.** What does "abort" do during the optimistic window (after navigation, before mutation responds)? The thread doesn't actually exist on the server yet. Recommend: abort button is hidden until the server confirms thread creation. Confirm.
- **Q9.** Error handling: if the `createThread` mutation fails after the user navigated, what does the UI do? Show an error in the thread view with a retry button? Bounce back to home? Recommend stay on the URL with a clear error UI + retry. Confirm.

### Validation

- Hit Enter on home page → URL updates instantly, thread view renders with user message visible and a streaming placeholder.
- Thread appears in sidebar list immediately, labeled appropriately.
- Real `_id` arrives within normal time; UI updates seamlessly with no visible swap.
- Refreshing the page during the optimistic window: handled gracefully (either re-resolves the clientId or shows clear "creating..." state).
- `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`.

### Carry-over to 3c

- **Per-mutation hook split is deferred to 3c.** 3b intentionally parks the full `optimisticallyCreateThread` inside `thread/lib/mutations.ts` alongside `useThreadMutations`. The file is already noticeably long with just one optimistic update; as more mutations grow their own optimistic updates in 3c, each will be extracted into its own package-internal hook file (e.g., `thread/hooks/use-create-thread.ts`) with `useThreadMutations` staying as the lean aggregator + sole public export. See Phase 3c step 5 + Q10.

---

## Phase 3c — Roll out the shared-features pattern to remaining hooks (~3 days)

### Goal

Apply the Wave 1 Track A pilot pattern to all remaining over-opinionated hooks. End state: shared hooks expose raw queries/mutations; selects and event handlers happen at the call site.

### Steps

1. **Use the co-located per-feature `lib/` layout locked in Wave 1 Track A.** Each feature gets its own `lib/queries.ts` and `lib/mutations.ts`. `thread/lib/queries.ts` and `thread/lib/mutations.ts` already exist from Wave 1. Create the rest as needed: `messages/lib/queries.ts`, `billing/lib/queries.ts`, `library/lib/mutations.ts`, etc. Follow the start-faster patterns at `/Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/lib/page-queries.ts` and `/Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/hooks/use-page-mutations.ts`.
2. **Dismantle the monolithic root `/packages/features/src/lib/queries.ts`.** Move each remaining export into its feature's co-located `lib/queries.ts`, wrap with TanStack `queryOptions()`. Delete the root file when empty. Do NOT create a root `lib/mutations.ts` — mutations follow the same per-feature layout.
3. **Migrate the high-priority hooks one-by-one** in this order (each is independently shippable):
   - `useThreadList` → **leave alone.** Same as `useMessages`: the `select` sits on a private `firstPageQuery` that the hook never exposes, and the underlying `threadQueries.listFirstPage` is already in `thread/lib/queries.ts`. Both callers (`apps/web/src/app/_authenticated/-chat-sidebar.tsx`, `apps/xr/src/features/thread/components/xr/xr-thread-list.tsx`) only read `{ threads, status, loadMoreThreads, setSearch }`. Implementation-detail selects don't violate the 3c principle.
   - `useThreadMutation` → **delete the hook file entirely** once every mutation it re-exports has been migrated. Move `create`, `sendMessageInThread`, `delete`, `togglePinned`, `abort` into `thread/lib/mutations.ts` as `threadMutations.*` (alongside the existing `threadMutations.rename` from Wave 1, and the optimistic `threadMutations.create` from Phase 3b). Each consumer spreads `...threadMutations.X` into its own `useMutation` and attaches its own `onError` / `onSuccess`. **Do not preserve** the shared `onError: toast.error(...)` the hook currently bakes in — error UX differs between web and XR (and between contexts within the same app), which is the whole point of migrating away from centralising hooks. Web attaches `toast.error(...)` at the call site; XR uses `console.error()` only (no toasts in XR — ever, since users are in-headset). Remove the `useThreadMutation` export from `packages/features/src/thread/index.ts` after deletion.
   - `useMessages` → **leave alone.** The `select: (data) => data.page` here is purely internal: it lives on a private `firstPageQuery` the hook never exposes, and the hook's public API (`{ messages, loadMore, status }`) already hides pagination correctly. The 3c principle is "shared hooks shouldn't bake in select/onError/onSuccess that apps can't override," which doesn't apply to implementation-detail selects. Skip this migration. (Resolves Q11.)
   - `useUsage` → strip select, return raw plan/usage object. Query goes in `billing/lib/queries.ts`.
   - `useCurrentPlan` → strip select, return raw plan. Same file.
4. **Migrate medium priority:** `useFileMutation` → strip `onError`. Mutation goes in `library/lib/mutations.ts`.
5. **Split each mutation into its own per-mutation hook file, colocated with its optimistic update.** After Phase 3b, `thread/lib/mutations.ts` already holds a full `optimisticallyCreateThread` function plus the `useThreadMutations` aggregator, and will grow a lot as more mutations pick up optimistic updates. To keep the aggregator lean while keeping optimistic logic colocated with the mutation it belongs to:
   - Each mutation gets its own hook file, e.g. `thread/hooks/use-create-thread.ts`, `thread/hooks/use-rename-thread.ts`, `thread/hooks/use-delete-thread.ts`, `thread/hooks/use-toggle-pinned-thread.ts`, `thread/hooks/use-abort-thread.ts`, `thread/hooks/use-send-message-in-thread.ts`. Each file exports a single hook returning `mutationOptions({ mutationKey, mutationFn: useConvexMutation(api.x.y.z).withOptimisticUpdate(...) })` and defines the optimistic update function in the same file (private, non-exported).
   - `thread/lib/mutations.ts` keeps the `useThreadMutations` aggregator hook, which calls each per-mutation hook and returns the aggregated object: `{ create: useCreateThread(), rename: useRenameThread(), delete: useDeleteThread(), ... }`. It stays short.
   - **Package-boundary enforcement**: per-mutation hooks are **package-internal**. `packages/features/src/thread/index.ts` exports **only** `useThreadMutations` (and `threadQueries`), never the per-mutation hooks. That's the contract: apps cannot access a mutation without going through the aggregator, which guarantees the optimistic update is always attached. Consider an ESLint `no-restricted-imports` rule on `packages/features/src/**/hooks/use-*-*.ts` from outside the package as cheap insurance.
   - Same pattern for other features: `messages/hooks/use-send-message-optimistic.ts`, `library/hooks/use-upload-file.ts`, etc., each aggregated by `useMessagesMutations` / `useFileMutations` in their feature's `lib/mutations.ts`.
   - Only logic that's truly shared across all apps goes inside the optimistic update — anything app-specific (e.g., toasts) stays at the call site via `...mutations.create` spread + consumer-attached `onSuccess` / `onError`.
6. **Update every consumer** in `apps/web` and `apps/xr`:
   - Replace the now-removed select/derivation with call-site equivalents.
   - Add app-specific `onSuccess` / `onError` handlers (e.g., toast on web, haptic on XR).
   - The web wrapper hooks (e.g., `/apps/web/src/features/composer/hooks/use-send-message.ts`) and XR wrappers (`/apps/xr/src/features/composer/hooks/use-send-message.ts`) are the natural home for app-specific event handlers.
7. **Confirm the convex-react / TanStack Query provider setup** in both `apps/web` and `apps/xr`. The web app has it (`__root.tsx:45`). Verify XR.

### Open questions

- **Q10. Resolved.** After Phase 3b, `thread/lib/mutations.ts` holds `useThreadMutations` (grouped-object-with-per-key-`mutationOptions`, matching start-faster's `pageMutations`) plus the full `optimisticallyCreateThread` function inline. Decision (confirmed during 3b): in 3c, split each mutation + its optimistic update into its own per-mutation hook file (`use-create-thread.ts`, etc.), keep `useThreadMutations` in `lib/mutations.ts` as a lean aggregator, and export **only** the aggregator from the feature's `index.ts` — per-mutation hooks stay package-internal so apps can't bypass the attached optimistic update. See step 5 above.
- **Q11. Resolved.** `useMessages` stays as-is. Its `select` is implementation-detail (private `firstPageQuery`), not a bake-in imposed on callers. Audit found the only two call sites (`apps/web/src/features/messages/messages.tsx`, `apps/xr/src/features/messages/components/xr/xr-messages.tsx`) only read `{ messages, loadMore, status }` — the public API is already clean. Skip the migration.
- **Q12. Resolved.** Hard rule: **no toasts in XR, ever** (users are in-headset — toasts don't belong there). XR call sites use `console.error()` only; in-XR error affordances get designed later as their own concern. Web continues to use `toast.error()` at the call site.
- **Q13. Resolved.** Rely on convention + review. No lint rule. Real escape hatches exist (e.g., internal selects like `useMessages`), and the repo already has heavy `no-restricted-syntax` coverage — adding more would create friction on legitimate cases.

### Validation

- Every consumer still works (web full app smoke test; XR if available).
- No `select` in `packages/features` hooks.
- No `onError`/`onSuccess` in `packages/features` hooks for shared cases.
- Optimistic updates land where they belong (`lib/mutations.ts`).
- `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:fix`.

---

## Risks specific to this wave

- **Phase 3a's deletion of the 3s timeout** depends on Wave 2 having actually fixed the false-positive-flash bug. If Wave 2 is incomplete, do not delete the timeout.
- **Phase 3b's clientId routing** is the biggest UX risk in this wave. URL stability and backbutton behavior need testing across edge cases (refresh during optimistic window, error during create, two simultaneous creates).
- **Phase 3c is high-churn.** ~25 call sites across web + XR. Risk of subtle regressions in selects that were doing something non-obvious. Migrate hook-by-hook with manual smoke testing per hook.
- **Mobile: assess scope.** The user mentioned mobile in the Notion doc as an example of differing onError. If a mobile app is in scope (not visible in `apps/`), confirm it's accounted for.

## Cross-wave dependencies

- **Requires** Wave 1 Track A (the pilot pattern that Phase 3c extends).
- **Strongly recommended after** Wave 2 (events-derived state makes Phase 3a clean and Phase 3b's clientId mapping cleaner).
- **No interaction** with Wave 4 (Effect).
