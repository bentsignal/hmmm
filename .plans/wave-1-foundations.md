# Wave 1 — Foundations

> **Status:** Ready for implementation. All clarifying questions answered and decisions locked (see the "Decisions" subsections in each track).
> **Estimated effort:** ~1 week.
> **This wave has two independent tracks (A and B). They do not depend on each other and can be picked up by two different agents in parallel. If one agent is doing both, do them in either order — Track A is faster to ship; Track B requires running real instrumentation first.**
>
> **For implementing agents:** this document is self-contained. You do not need the conversation history that produced it. Read the full Track you're assigned, including the `Decisions` and `Current state in this repo` subsections, before touching any code. Every subsection is there for a reason; the `Decisions` lines are not suggestions — they are locked-in user choices.

---

## Why this is Wave 1

This wave was extracted from the synthesis discussion in the planning conversation. The reasoning:

- These are the only two pieces of work that are **fully independent** of all the others, **safe to ship in isolation**, and **prerequisites for what comes after**.
- Track A (shared-features pattern pilot) needs to land before Wave 3 so that optimistic updates in Wave 3 can plug into the new pattern instead of the old, over-opinionated one.
- Track B (instrumentation + extended context wrapper) needs to land before Wave 2 so the unified agent refactor has a context shape ready to carry batched-mutation buffers, and so we have a baseline to verify Wave 2 actually made things faster.

We deliberately **do not** start with the big agent refactor (Wave 2) because we want a measured baseline first.

---

## Track A — Pilot the shared-features pattern

### Source of intent

Pulled from the Notion task **"Updates to shared features"** (https://www.notion.so/3463b59a4f9c806d9048d0093f51b3cd).

Direct quote from that doc (this is exactly what we're solving):

> Currently the queries and mutations in the features package are a little too opinionated for my liking. For example, use-thread-status.ts has a select condition inside the query that makes it single purposed. Its not truly a hook to get the thread status, its a hook to see if the status is equal to idle.
>
> What I want is something more along the lines of what I've created in another project of mine, start faster, found at /Users/shawn/dev/projects/start-faster
>
> /Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/hooks/use-page-mutations.ts
> /Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/lib/page-queries.ts
>
> as you can see from these two files, the stuff that's shared is not shaped to any specific purpose. It is the queries as they should be, which can then be unpacked in the actual app where they're needed. And then you can go ahead and select the data you need or do this, that, or the other, or have special on success or on error conditions. Because those things differ depending on, like if you're implementing on mobile, your on error condition is going to differ from when you're implementing on web. But you still want to have the same mutation call and probably the same optimistic update. So for example, in use page mutations, you could write the optimistic updates for convex in that file. And those can be shared across the app. But things like the event handlers after the the mutation completes. Those can be written in the app code. Since we're using mutation options and query options through Tanstack Query with Convex, we can just unpack this stuff at the actual call site.

### Goal of Track A

Establish the start-faster pattern as the canonical shape for shared queries/mutations in `packages/features`. In this wave we:

1. **Pilot one query** — migrate `threadQueries.state` and **delete** `use-thread-status` entirely. Call sites use `useQuery(threadQueries.state(threadId))` directly and derive whatever shape they need locally.
2. **Pilot one mutation** — migrate `rename` (thread rename) to a shared `threadMutations.rename` exposing `mutationOptions`, including any truly-shared optimistic update. Call sites spread `...threadMutations.rename` into `useMutation` and layer on their own `onSuccess` / `onError`.

Wave 3 (Phase 3c) rolls the pattern out to the rest of the queries and mutations.

### Reference files to read first (mandatory)

- `/Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/lib/page-queries.ts` — the model for `lib/queries.ts`. Note: each export wraps a `convexQuery()` in TanStack `queryOptions()`. **No `select` clauses.**
- `/Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/hooks/use-page-mutations.ts` — the model for hook files that return `mutationOptions` (not `useMutation` results). Note: optimistic updates live here when truly shared; onSuccess/onError do not.
- `/Users/shawn/dev/projects/start-faster/apps/cms/src/features/pages/hooks/use-autosave.ts` (or any consumer in start-faster) — the model for how a call site spreads `...pageMutations.saveDraft` and adds its own `onSuccess`.

### Current state in this repo

- **Hook to delete:** `/Users/shawn/dev/projects/hmmm/packages/features/src/thread/hooks/use-thread-status.ts` — embeds `select: (state) => state === "idle"`. This hook goes away entirely; call sites will use `useQuery(threadQueries.state(threadId))` directly and derive what they need.
- **Source query:** `threadQueries.state(threadId)` currently defined in `/Users/shawn/dev/projects/hmmm/packages/features/src/lib/queries.ts` (monolithic file). Today it returns the raw `convexQuery()` result, **not** wrapped in TanStack `queryOptions()`. Per Q1, we're splitting by concern — this will move to `/packages/features/src/thread/lib/queries.ts`.
- **Backend query it points at:** `/Users/shawn/dev/projects/hmmm/packages/db/src/ai/thread/queries.ts` — the `getState` query (around lines 46–58).
- **Mutation to pilot:** `rename` in `/Users/shawn/dev/projects/hmmm/packages/db/src/ai/thread/mutations.ts` (around line 62). The shared `mutationOptions` goes in `/packages/features/src/thread/lib/mutations.ts`. Grep for existing `useMutation` call sites that call the thread rename and refactor them to spread `...threadMutations.rename`.
- **Internal callers of `useThreadStatus`** to update:
  - `/Users/shawn/dev/projects/hmmm/packages/features/src/composer/hooks/use-send-message.ts` — uses `isThreadIdle`.
  - `/Users/shawn/dev/projects/hmmm/apps/web/src/features/composer/components/composer-send.tsx` — uses derived `isGenerating`.
  - Any other call sites — grep for `useThreadStatus` and `threadQueries.state`.

### Decisions (from Q&A with user)

- **Q1 → split by concern.** Queries live co-located in `/packages/features/src/thread/lib/queries.ts`, not in the monolithic root `lib/queries.ts`. (Any non-thread exports from the existing root file stay where they are or move to their own feature folder — only migrate thread-related entries in this wave.)
- **Q2 → no hook.** `useThreadStatus` is deleted. Call sites use `useQuery(threadQueries.state(threadId))` directly and pull what they need from the full TanStack Query result. No wrapper hook tries to satisfy everyone.
- **Q3 → N/A** (no hook).
- **Q4 → pilot one mutation too.** Mutation choice: `rename` — simple, has a clean optimistic-update story (write the new title), outside Track B's hot paths.

### Steps

1. **Read the start-faster reference files end-to-end.** Do not skip this. The pattern is subtle (where optimistic logic lives vs. event handlers).
2. **Create `/packages/features/src/thread/lib/queries.ts`.** Move `threadQueries.state(threadId)` there, wrap in TanStack `queryOptions()`. **No `select` clause.** Return raw thread state shape.
3. **Delete `/packages/features/src/thread/hooks/use-thread-status.ts`.** Remove its export from the feature's index. If the `hooks/` folder becomes empty, delete it too.
4. **Update every call site** to use `useQuery(threadQueries.state(threadId))` directly and derive its own booleans (e.g. `state === "idle"`, `state === "streaming"`). Known call sites: `use-send-message.ts` (derives `isThreadIdle`), `composer-send.tsx` (derives `isGenerating`). Grep for other uses.
5. **Create `/packages/features/src/thread/lib/mutations.ts`.** Export a `threadMutations` object whose `rename` entry returns `mutationOptions({ mutationFn: useConvexMutation(api.threads.rename), /* optimistic update if truly shared */ })`. Follow start-faster's `use-page-mutations.ts` shape exactly.
6. **Refactor existing thread-rename call sites** to spread `...threadMutations.rename` into `useMutation` and attach their own `onSuccess` / `onError` at the call site.
7. **Confirm TanStack Query + Convex provider is set up correctly.** Subagent research found `@tanstack/react-query` and `@convex-dev/react-query` installed, with `QueryClient` initialized in the web app's router context (around `__root.tsx:45`). Verify the same is true for `apps/xr` so the new pattern works there too.
8. **Run the validation checklist** at the bottom of this file.

### Validation

- `pnpm run lint` passes.
- `pnpm run typecheck` passes.
- `pnpm run format:fix` ran clean.
- Web app: thread send/abort UX renders identically to before — no behavioral regression.
- XR app (if affected): same.
- Manually verify: send a message, watch thread status flip from "waiting" → "streaming" → "idle". Confirm the UI reflects this (composer disables/enables, abort button shows/hides) exactly as it did before.
- Manually verify: rename a thread. Title updates optimistically; server confirms; refreshing the page shows the new title.

### Done criteria

- `useThreadStatus` is deleted; no `select` clauses remain in shared thread queries.
- `threadQueries.state(...)` lives in `/packages/features/src/thread/lib/queries.ts` and uses TanStack `queryOptions()`.
- `threadMutations.rename` lives in `/packages/features/src/thread/lib/mutations.ts` and returns `mutationOptions`. All rename call sites have been migrated to spread it.
- Call sites derive their own booleans (e.g., `state === "idle"`) and attach their own `onSuccess` / `onError` to mutations.
- Pattern is obvious enough that the rest of the migration in Wave 3 is mechanical.

---

## Track B — Instrument + extend the context wrapper

### Source of intent

Pulled from the Notion task **"Improve mutation and query speed"** (https://www.notion.so/33f3b59a4f9c80c2a48fcab3aa8f1ee5).

Direct quote (this defines the approach):

> Takes way too long to create a new thread and to start getting a response for new messages. One area I think we could do better in is reducing the number of duplicate calls per mutation or query. So for example, for creating new threads and sending messages inside of those threads, I think there are a few different places where we get subscription information, check usage and whatnot. What we could do is create a special type of context, which in turn creates special function types like mutations and queries where we fetch these ones at the top and then can access them through context wherever. So for example, I have somewhere in one of my convex helper files, I believe at the root of the db directory, I have created custom like auth context where we make sure that the user is authenticated before we allow this function to run at all. So what we could do is create separate functions that are similar to these where they check off, but then after checking off, they also check usage and check subscription status, you know, stuff like that. And that way, down the line, as we call helper functions throughout the special mutations and queries, we can specify that the context that we pass to these helper functions is our special context type. And in those helper functions, we can just say, Oh, like what is context usage? Is it, what is context.sublevel or something like that?

### Wrapper strategy

**Create new wrappers incrementally, only as hot paths demand them.** Do NOT build one monolithic `superAuthedMutation` that pre-fetches everything — that would slow down cheap mutations that don't need the data. Do NOT build a separate wrapper per function — that's unmaintainable. Strike a balance: group fields that are commonly needed *together* into a single wrapper that covers a cluster of related hot paths.

For Wave 1, exactly one new wrapper pair is needed: **`usageCheckedMutation`** and **`usageCheckedQuery`**, for use by `sendMessage` and `create`. Every other existing mutation stays on plain `authedMutation`.

### Goal of Track B

Two outputs, in strict order:

1. **Latency baseline.** We currently have no instrumentation. Establish per-step numbers for `sendMessage` and `create` before touching anything. **Report numbers to the user and pause for direction** before Step 2. Target is ~200ms; current user-observed latency is ~800ms for both mutations.
2. **`usageCheckedMutation` / `usageCheckedQuery` wrapper** that eagerly pre-fetches `userPlan`, `userInfo`, and `usage` into ctx. Helpers in the call graph change signatures to read from this extended ctx instead of re-fetching. `sendMessage` and `create` migrate to the new wrapper. Re-measure and compare against baseline.

### Decisions (from Q&A with user — all locked)

- **Wrapper name:** `usageCheckedMutation` / `usageCheckedQuery`. Compose on top of `authedMutation` / `authedQuery` via `customCtx` from `convex-helpers`.
- **Access style:** **Eager.** Fields are pre-fetched before the mutation body runs and accessed as plain properties (`ctx.userPlan`, `ctx.userInfo`, `ctx.usage`). No `ctx.getUsage()`-style accessors. Rationale: the only reason to opt into this wrapper is that you *need* this data — deferring buys nothing.
- **Pre-fetched fields (exactly three):**
  - `userPlan` — result of `getUserPlanHelper(ctx, userId)`. One fetch eliminates the Polar + `hasUnlimitedAccess` duplicate.
  - `userInfo` — result of `getUserInfoHelper(ctx, userId)`. Already being fetched once per mutation; moving it to ctx costs nothing and lets helpers stop re-fetching.
  - `usage` — result of `getUsageHelper(ctx, userId)`. Currently fetched in `validateMessage`; moving it to ctx lets us remove the internal `getUserPlanHelper` call inside `getUsageHelper` (pass `userPlan` in instead).
- **Helpers that change signature:** see "Helpers to refactor" below.
- **Mutations that stay on plain `authedMutation`:** `rename` (line 62), `abortGeneration` (line 176), `deleteThread` (line 209), `togglePinned` (line 276). None of them need plan/usage data. Do not migrate.
- **API-key variants (`apiMutation` / `apiQuery`) — SKIPPED.** Only two call sites exist: `verifyUpload` (`packages/db/src/app/storage.ts:108`) does hit `getUserPlanHelper` indirectly, but it's low-frequency file upload verification; `apiUpdatePreference` (`packages/db/src/mail/newsletter.ts:8`) doesn't hit the slow path at all. Not worth building a parallel `usageCheckedApi*` wrapper yet. Revisit only if an API hot path emerges.
- **Polar caching — SKIPPED.** Research showed `polar.getCurrentSubscription` is NOT an external HTTP call — it's a Convex query against local tables (`customers`, `subscriptions`, `products` via `@convex-dev/polar` component, initialized at `packages/db/src/polar.ts:7`). Tables are kept in sync via Polar webhooks. Sub-ms indexed reads. A TTL cache would add complexity for zero gain. If Step 1 numbers shockingly show Polar as the bottleneck after all, reopen this — but the expectation is that it won't be.
- **Instrumentation mechanism:** plain `console.log` with a `perf:` prefix so it's easy to grep and strip. Convex logs carry timestamps automatically. Read logs via the Convex MCP `logs` tool (`mcp__convex__logs`) rather than asking the user to paste them. The user's flow is: they trigger a send/create in the app, the agent reads the Convex logs, the agent extracts timings.

### Current state in this repo (verified by subagent trace)

- **Existing custom wrappers:** `/Users/shawn/dev/projects/hmmm/packages/db/src/convex_helpers.ts`. `authedMutation` / `authedQuery` use `customCtx` from `convex-helpers` around lines 48–62 and put only `{ user }` on ctx. `apiMutation` / `apiQuery` (lines 26–35) use a different pattern — they don't use `customCtx`, they validate an API key arg and strip it. **Keep them untouched.**
- **Hot paths to optimize:**
  - `/Users/shawn/dev/projects/hmmm/packages/db/src/ai/thread/mutations.ts` — `sendMessage` (lines 133–174) and `create` (lines 73–131).
- **Redundancy map (from subagent trace, same pattern in both mutations):**
  - `getUserPlanHelper` is invoked **twice** per mutation via two independent call paths:
    - Path 1: `validateMessage` → `getUsageHelper` → `getUserPlanHelper`.
    - Path 2: `getPerferredModelIfAllowed` → `allowModelSelection` → `getPlanTierHelper` → `getUserPlanHelper`.
  - Each invocation triggers both `polar.getCurrentSubscription` and `hasUnlimitedAccess` (which reads `users` by userId). So: 2x Polar reads, 2x users-table reads, per mutation.
  - `getUserInfoHelper` is invoked once (fine).
  - `usage.sum()` aggregate (in `getUsageHelper`) runs once per call, so 2x total today — this is a moderate-cost DB scan worth measuring separately.
- **Helpers to refactor** (signature change to accept extended ctx):
  - `validateMessage` — `/packages/db/src/ai/thread/helpers.ts:95-113`. Stop calling `getUsageHelper`; read `ctx.usage` instead.
  - `getUsageHelper` — `/packages/db/src/user/usage.ts:72-113`. Either (a) accept `userPlan` as a parameter so it stops calling `getUserPlanHelper` internally, or (b) lift the internal `getUserPlanHelper` call out into the wrapper and leave `getUsageHelper` as a purely arithmetic helper. Prefer (b) if clean.
  - `getPerferredModelIfAllowed` — `/packages/db/src/user/info.ts:104-121`. Accept extended ctx; replace its internal `allowModelSelection` / `getPlanTierHelper` chain with logic that reads `ctx.userPlan` directly.
  - `allowModelSelection` / `getPlanTierHelper` — `/packages/db/src/user/subscription.ts`. May be reducible to pure functions that take `userPlan` rather than `ctx`. Inline if trivial.
  - `getUserPlanHelper` / `getUsageHelper` — called from the wrapper itself, once. Do not call from helpers anymore.
- **Other data accessed (for reference, not part of wrapper):** `authorizeAccess` / `getMetadata` (thread lookup + admin check in `helpers.ts:40-58, 32-38`), rate limiter (`limiter.ts:31-42`), file attachments (`helpers.ts:196-200`). These are unchanged by this refactor.

### Steps

#### Step 1 — Instrument first (do NOT skip this, do NOT merge Step 1 and Step 2 into one PR)

1. Add `console.log("perf: <label>", Date.now() - start)` (or equivalent) at:
   - Entry and exit of `sendMessage` and `create` (for total duration).
   - Before/after `authorizeAccess`.
   - Before/after `getUserInfoHelper`.
   - Before/after each of the two `getUserPlanHelper` invocations (label them distinctly so duplicates are visible — e.g. `plan:via-usage`, `plan:via-model-check`).
   - Before/after `polar.getCurrentSubscription` (inside `getUserPlanHelper`, if reachable; otherwise wrap the two call sites).
   - Before/after `hasUnlimitedAccess`.
   - Before/after `getUsageHelper` (including its internal `usage.sum()` aggregate).
   - Before/after `getPerferredModelIfAllowed` and `allowModelSelection`.
   - Before/after the rate limiter (`messageSendRateLimit`).
   - Before/after `validateMessage`.
   - Before/after `saveUserMessage` (since it hits the files table).
2. Run `pnpm run lint` / `pnpm run typecheck` — the logs shouldn't break anything.
3. User triggers 5 `sendMessage` calls and 5 `create` calls from the web app. Agent reads logs via `mcp__convex__logs` and extracts per-step timings.
4. **Pause. Present the numbers to the user in a tabular summary:** mean + max per step, plus the total. Call out what dominates. Wait for user direction before Step 2.

#### Step 2 — Build the `usageCheckedMutation` / `usageCheckedQuery` wrapper (only after Step 1 numbers are reviewed)

1. Read `/packages/db/src/convex_helpers.ts` end-to-end. Notice the `customCtx` pattern used for `authedMutation`.
2. In the same file, add:
   ```ts
   export const usageCheckedMutation = customMutation(
     mutation,
     customCtx(async (ctx) => {
       const user = await checkAuth(ctx);
       const [userPlan, userInfo, usage] = await Promise.all([
         getUserPlanHelper(ctx, user._id),
         getUserInfoHelper(ctx, user._id),
         getUsageHelper(ctx, user._id /*, userPlan */), // see note
       ]);
       return { user, userPlan, userInfo, usage };
     }),
   );
   ```
   …and the matching `usageCheckedQuery`. (The `usage` fetch today depends on plan — if `getUsageHelper` is refactored to accept `userPlan` as a param, sequence the calls accordingly; otherwise pre-compute `userPlan` first, then run `userInfo` + `usage` in parallel. Pick whichever is cleaner after reading the code.)
3. Refactor helpers listed under "Helpers to refactor" to accept the new ctx shape and read `ctx.userPlan` / `ctx.usage` / `ctx.userInfo` instead of re-fetching. Type the ctx parameter as the extended shape.
4. Migrate `sendMessage` and `create` from `authedMutation` to `usageCheckedMutation`.
5. Re-run Step 1's instrumentation path: user triggers 5 + 5 calls, agent reads logs, presents before/after comparison. Expected outcome: plan/usage fetches each drop from 2 to 1 occurrence per mutation.
6. **Do not delete the `perf:` logs yet** — wait until the user confirms they're happy with the numbers. Then strip them in a follow-up commit.

### Validation

- `pnpm run lint` passes.
- `pnpm run typecheck` passes (the extended ctx type must propagate cleanly through every refactored helper — no `any` shortcuts).
- `pnpm run format:fix` ran clean.
- Latency numbers: tabular before/after for `sendMessage` and `create`. Document delta per step + total.
- Functional parity: thread create + message send + rename + delete + pin all behave identically to before.
- No reduction in checks: usage limits and subscription gating still work end-to-end. Test by (a) sending past the usage limit on a non-unlimited account, (b) sending as an unsubscribed user, (c) sending with a model the user's plan doesn't allow.

### Done criteria

- Baseline + post-change latency numbers documented (in PR description).
- `usageCheckedMutation` and `usageCheckedQuery` exist in `convex_helpers.ts` and eagerly expose `userPlan`, `userInfo`, `usage`.
- `sendMessage` and `create` use the new wrapper. All other mutations remain on `authedMutation`.
- Call graph for both mutations fetches plan / usage / userInfo exactly once each (verify via instrumentation).
- Existing gating still works end-to-end.
- `perf:` logs are removed (or gated behind a debug flag) once the numbers are confirmed.

---

## Cross-track dependencies

None. Track A and Track B touch disjoint files (features-package frontend hooks vs. db-package backend wrappers). They can land in either order.

## Validation gates before starting Wave 2

Wave 2 (the unified agent + state refactor) **should not begin until Track B is done**, because:
1. Wave 2 needs the latency baseline to know whether its changes actually moved the needle.
2. Wave 2 will use the extended context wrapper to carry the batched-mutation buffer.

Track A has no gate to Wave 2 but should land before Wave 3 (which extends the same pattern to the rest of the hooks).
