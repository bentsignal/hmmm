---
name: react
description: React coding standards for this project. Use when writing or modifying React components, hooks, or route files.
---

# React

These are the React standards for this project. Follow them when writing or modifying any React code. For detailed rationale, examples, and edge cases on composition and data patterns, see the individual [reference files](references/).

## Composition

- Code should read like prose. Every file should have a clear, single purpose.
- Separate concerns by file: business logic in hooks/utilities, UI in components, data fetching config in query builders. Exception: a component and its dedicated hook may live in the same file when the hook serves only that component.
- Build complex behavior by composing small hooks and small components — do not let a single unit grow.
- **Route files**: All route-level configuration (search params, loader, beforeLoad, head, meta, error/pending components, static data, etc.) defined inline — never imported from a separate config file. A route file contains at most **one hook** (showing what data the page needs) and **one route component** (containing the actual page markup). Nothing else — no sub-components, constants, types, or extra hooks. Those belong in feature directories. Do not extract the entire route body into a single feature component; if the route would just render `<SomePage />`, that component's content belongs inline in the route component. If the page is simple, the route component just contains the markup directly.
- **Components**: Under ~80 lines or one distinct UI concern. Split if larger. Colocate tightly related sub-components in the same file when not reused elsewhere.
- **Hooks**: Under ~50 lines. Extract sub-hooks when larger. A coordinating hook should mostly be a sequence of calls to smaller hooks plus a return statement.
- Small inline handlers (a couple of lines) in components are fine. Anything more substantial should be extracted into a hook or utility.

## State Management

TanStack Query is the primary state management solution for server data. Components should pull data directly using hooks (`useSuspenseQuery`, `useSearch`, `useRouteContext`, `useStore`) at the leaf level where it's needed — **never prop drill data that a hook can provide directly**.

1. **Query caches** (TanStack Query for all data sources): The default for server data. Query at the component level — no prop drilling required. Centralize all query definitions (including Convex) into `*Queries` files using `queryOptions`.
2. **URL state** (TanStack Router `validateSearch` + `useSearch`): For state that should persist across refreshes, be shareable via link, or be bookmarkable.
3. **Rostra stores**: Only for non-server state — form inputs before submission, global concerns (auth, theme), UI state shared across a subtree. See the `rostra` skill for implementation details.
4. **Prop drilling**: Least preferred, and usually unnecessary. One level of props is normal for component-specific configuration. Passing data available via hooks through multiple intermediary components is always wrong. Before prop drilling though, you should always ask yourself if one of the solutions above could be used instead, typically the answer is yes.

When uncertain about the right choice, ask the user.

## Data Loading

- **Component + hook pattern**: Components with more than ~5 lines of business logic (queries, mutations, derived state, handlers) should pair with a co-located hook that owns all that logic. The hook returns only what the component actually uses — named variables and callbacks, never raw query objects or large data structures. The component is a thin renderer. For components with minimal data access (a single query call and a line or two of derivation), inline logic in the component body is fine — extracting a hook for 3 lines of logic adds ceremony without improving readability.
- **Route loaders**: Prefetch with `ensureQueryData` (or `ensureInfiniteQueryData`). Declare `loaderDeps` when the loader depends on search params.
- **Centralized query definitions**: All queries — Convex and non-Convex — should be centralized into `*Queries` files using `queryOptions`. For Convex, wrap `convexQuery()` in `queryOptions()` — no explicit `queryKey` needed since `convexQuery` generates keys automatically.
- **Centralized mutation definitions**: Use `mutationOptions` for all mutations. Convex mutations must be defined inside a hook (since `useConvexMutation` is a hook).
- **Components**: Consume prefetched data with `useSuspenseQuery`. Since the loader already populated the cache, this resolves synchronously. Pull data at the leaf component — do not drill it from parents.
- **Fine-grained data hooks**: Prefer many small hooks that each `select` the minimum data one consumer needs over a single shared hook that returns a large object. The query cache deduplicates fetches, so multiple hooks hitting the same query key with different `select` functions cost nothing. Name hooks after the data they provide (`useCartQuantity`, `useProductTitle`), not the query they read from.
- **Optimistic updates**: For TanStack Query — cancel in-flight queries in `onMutate`, snapshot previous data, apply optimistic change, roll back in `onError`. For Convex — use `.withOptimisticUpdate`. Prioritize for actions where perceived latency matters (cart ops, toggles, inline edits).
- **Loading/error states**: Do NOT manually write loading spinners or error checks. TanStack Start handles this at the route level via `defaultPendingComponent`, `defaultErrorComponent`, and `defaultNotFoundComponent`. Only check mutation status (`isPending`, `isError`) for mutation-driven UI feedback.

## Performance

- **Push state down**: Own state in the leaf component that needs it, not in a shared parent.
- **Split at render boundaries**: Separate frequently-changing state from expensive-to-render UI into different components.
- **Compose with children**: When a wrapper needs state but its children don't depend on it, pass children through as a prop to avoid re-rendering the subtree.
- **Stable references**: Hoist static objects/arrays to module scope. Inline object/array literals create new references every render, which matters when the receiver relies on referential equality.
