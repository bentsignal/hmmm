# Data and State

## Overview

TanStack Query is both the data-fetching layer and the primary state management solution for server data. Most components should get their state by querying data directly via `useSuspenseQuery` rather than hoisting it into stores or drilling it through props. Rostra stores are reserved for state that lives outside the data-fetching lifecycle — form inputs, theme, auth. Each component should pair with a co-located hook that owns all business logic; the component itself is a thin renderer.

## The Component + Hook Pattern

The default architecture for any component that consumes data or performs actions is: one exported component and one unexported co-located hook in the same file. The hook owns all business logic — queries, mutations, derived state, navigation. The component owns rendering.

```tsx
export function CreatePageButton() {
  const { createPage, isCreating, isError } = useCreatePage();

  return (
    <Button
      onClick={createPage}
      disabled={isCreating}
      variant={isError ? "destructive" : "default"}
    >
      {isCreating ? (
        <Loader className="size-4 animate-spin" />
      ) : isError ? (
        <>
          <RotateCcw className="size-4" />
          Failed to create page, try again
        </>
      ) : (
        <>
          <Plus className="size-4" />
          Create Page
        </>
      )}
    </Button>
  );
}

function useCreatePage() {
  const navigate = useNavigate();
  const pageMutations = usePageMutations();
  const { mutate, isError } = useMutation({
    ...pageMutations.createPage,
    onSuccess: (data) => {
      void navigate({
        to: "/pages/$pageId",
        params: { pageId: data.pageId },
        search: {},
      });
    },
  });
  const isCreating = useIsPending(pageMutations.createPage.mutationKey);
  return { createPage: () => mutate({}), isCreating, isError };
}
```

The component reads like a description of UI. The hook reads like a description of behavior. When an agent looks at this file, it sees both concerns clearly separated but co-located for discoverability.

The co-located hook should return only what the component actually uses — named variables and callbacks, not raw query objects or large data structures. If the component needs a quantity and a delete action, the hook returns `{ quantity, deleteItem }`, not `{ cart, cartQuery }`. This keeps the interface between hook and component tight and explicit.

When a hook is reused across multiple components, extract it to a shared hooks directory. See the `composition` reference for size limits — if the co-located hook exceeds ~50 lines, decompose it into sub-hooks.

## Centralized Query and Mutation Definitions

All queries and mutations — whether Shopify, REST, or Convex — should be centralized into `*Queries` / `*Mutations` files using `queryOptions` and `mutationOptions` from TanStack Query. This keeps query keys, fetch logic, and mutation logic organized by feature rather than scattered across components.

### Non-Convex Queries (Shopify, REST, etc.)

Use `queryOptions` with explicit `queryKey` and colocated `queryFn`. Build query keys hierarchically so broader invalidations work:

```tsx
import { queryOptions } from "@tanstack/react-query";

export const productQueries = {
  productByHandle: (handle: string) =>
    queryOptions({
      queryKey: ["product", handle],
      queryFn: async () => {
        const response = await shopify.request(getProduct, {
          variables: { handle },
        });
        const product = response.data?.product;
        if (!product) throw notFound();
        return product;
      },
    }),
};
```

### Convex Queries

Wrap `convexQuery()` in `queryOptions()`. No explicit `queryKey` is needed — `convexQuery` generates stable query keys automatically under the hood:

```tsx
import { queryOptions } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

import { api } from "@acme/convex/api";

export const pageQueries = {
  list: () => queryOptions({ ...convexQuery(api.pages.list, {}) }),
  getById: (pageId: Id<"pages">) =>
    queryOptions({ ...convexQuery(api.pages.getById, { pageId }) }),
};
```

### Convex Mutations

Wrap `useConvexMutation()` in `mutationOptions()` with an explicit `mutationKey`. Because `useConvexMutation` is a hook, these must be defined inside a hook:

```tsx
import { mutationOptions } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";

import { api } from "@acme/convex/api";

export function usePageMutations() {
  return {
    createPage: mutationOptions({
      mutationKey: ["create-page"],
      mutationFn: useConvexMutation(api.pages.create),
    }),
    saveDraft: mutationOptions({
      mutationKey: ["save-draft"],
      mutationFn: useConvexMutation(api.pages.saveDraft),
    }),
  };
}
```

### Non-Convex Mutations

Follow the same `mutationOptions` pattern. Since these don't use hooks, they can be plain objects:

```tsx
export const cartMutations = {
  lineAdd: mutationOptions({
    mutationKey: ["cart", "mutation", "line", "add"],
    mutationFn: async (variables: { cartId?: string; merchandiseId: string }) =>
      addCartLineFn({ data: variables }),
  }),
};
```

Organize by feature: `page-queries.ts`, `cart-queries.ts`, `use-page-mutations.ts`, etc.

## Route Loaders

Route loaders are the entry point for data fetching. Prefetch data in the loader using `ensureQueryData` so it's already cached when the component tree mounts. Use the centralized query definitions:

```tsx
export const Route = createFileRoute("/pages")({
  component: PagesRoute,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(pageQueries.list());
  },
});
```

When the loader depends on search params, declare the dependency with `loaderDeps`:

```tsx
export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      userAccessQueries.searchFirstPage(sanitizeSearch(deps.q)),
    );
  },
  validateSearch: z.object({
    q: z.string(),
  }),
});
```

## Consuming Data in Components

After the route loader has prefetched, consume cached data with `useSuspenseQuery`. Since the loader already populated the cache, this resolves synchronously:

```tsx
const { data: pages } = useSuspenseQuery({
  ...pageQueries.list(),
  select: (data) =>
    data.map((p) => ({
      _id: p._id,
      title: p.title,
      path: p.path,
    })),
});
```

Use `select` whenever the component only needs a slice of the query result. This is covered in detail in the `performance` reference, but it bears repeating: never subscribe to an entire query result when the component only uses part of it.

Pull data at the leaf component where it's needed — never drill it down from a parent.

## Fine-Grained Data Hooks

Prefer many small hooks that each select the minimum data one consumer needs over a single shared hook that returns a large object.

The query cache already holds all the data. Any component can call `useSuspenseQuery` with the same query key and a different `select` — TanStack Query deduplicates the underlying fetch. This means there is no cost to having multiple hooks hit the same query; each one just projects a different slice.

```tsx
// ✅ CORRECT — each hook selects only what its consumer needs
function useCartQuantity() {
  const { data: quantity } = useSuspenseQuery({
    ...cartQueries.detail(cartId),
    select: (cart) => cart.totalQuantity,
  });
  return quantity;
}

function useCartCheckoutUrl() {
  const { data: checkoutUrl } = useSuspenseQuery({
    ...cartQueries.detail(cartId),
    select: (cart) => cart.checkoutUrl,
  });
  return checkoutUrl;
}
```

```tsx
// ❌ WRONG — "kitchen sink" hook that returns a large object for many consumers
function useCart() {
  const cartQuery = useSuspenseQuery(cartQueries.detail(cartId));
  return {
    cart: cartQuery.data,        // entire cart object
    cartQuantity: cartQuery.data.totalQuantity,
    cartQuery,                   // raw query object leaked to consumers
  };
}
```

The kitchen-sink pattern creates several problems:

1. **Unnecessary re-renders.** Every consumer subscribes to the entire cart, so a price change re-renders the quantity badge.
2. **Hidden coupling.** Consumers depend on the full cart shape even when they only use one field, making refactors harder.
3. **Opaque intent.** When reading the consuming component, you can't tell which fields it actually needs — you have to trace through the returned object.

When you need data from the same query in multiple components, write a small hook per concern that selects just what that concern needs. Name the hook after the data it provides (`useCartQuantity`, `useProductTitle`), not after the query it reads from.

## Do Not Prop Drill — Pull Data Where You Need It

This is the single most important rule for state flow in this project. Hooks like `useSearch`, `useSuspenseQuery`, `useRouteContext`, and `useStore` exist specifically so that any component in the tree can pull data directly. **If a hook gives a component direct access to the data it needs, use the hook. Do not pass that data through props from a parent.**

```tsx
// ❌ WRONG — drilling search params through intermediaries
function ParentRoute() {
  const search = useSearch({ from: "/products" });
  return <Filters sortBy={search.sortBy} />;
}
function Filters({ sortBy }: { sortBy: string }) {
  return <SortControl sortBy={sortBy} />;
}
```

```tsx
// ✅ CORRECT — pull data at the leaf where it's needed
function SortControl() {
  const sortBy = useSearch({
    from: "/products",
    select: (s) => s.sortBy,
  });
  // use sortBy directly
}
```

This applies equally to query data, route context, store state, and search params. The same data that's available via `useSearch` at the route level is available via `useSearch` in any descendant component. The same query the loader prefetched can be consumed via `useSuspenseQuery` in any descendant. There is no reason to read data at a high level and pass it down.

One level of props is normal for component-specific configuration (e.g. a `variant` prop on a button). But data available via hooks should always be pulled directly at the component that needs it.

## URL State

TanStack Start provides strong primitives for storing state in the URL. Define search param validators per route for validated, type-safe access:

```tsx
export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
  validateSearch: z.object({
    q: z.string().optional(),
  }),
});
```

Any descendant component can access the params directly:

```tsx
const searchTerm = useSearch({
  from: "/dashboard",
  select: (search) => search.q,
});
```

**Always use `select`** with `useSearch` so the component only re-renders when the specific param it uses changes.

URL state is the right choice when you want state that:

- Persists across full page refreshes
- Is shareable via link
- Survives if a user bookmarks the page

## Mutations

Mutations must always be driven by user events (clicks, form submissions, gestures). Never trigger a mutation from `useEffect`, render logic, or any other React lifecycle behavior.

At the call site, spread the centralized mutation entry and add only the handlers you need:

```tsx
const addToCart = useMutation({
  ...cartMutations.lineAdd,
  onSuccess: (nextCart) => {
    queryClient.setQueryData(
      cartQueries.detail(nextCart.id).queryKey,
      nextCart,
    );
  },
});
```

For Convex mutations:

```tsx
const pageMutations = usePageMutations();
const { mutate } = useMutation({
  ...pageMutations.saveDraft,
  onSuccess: () => {
    /* ... */
  },
});
```

## Optimistic Updates

Use optimistic updates for instant feedback on user actions. The approach differs between TanStack Query and Convex.

**TanStack Query**: Cancel in-flight queries in `onMutate`, snapshot previous data, apply the optimistic change, and roll back in `onError`:

```tsx
useMutation({
  ...cartMutations.lineUpdate,
  onMutate: async (variables) => {
    await queryClient.cancelQueries({
      queryKey: cartQueries.all().queryKey,
    });
    const cartQueryKey = cartQueries.detail(variables.cartId).queryKey;
    const previous = queryClient.getQueryData(cartQueryKey);
    queryClient.setQueryData(cartQueryKey, (current) =>
      current ? applyOptimisticCartLineUpdate(current, variables) : current,
    );
    return { previous };
  },
  onError: (_err, variables, context) => {
    if (context?.previous) {
      queryClient.setQueryData(
        cartQueries.detail(variables.cartId).queryKey,
        context.previous,
      );
    }
  },
});
```

**Convex**: Use the `.withOptimisticUpdate` API on the mutation:

```tsx
const updateAccess = useConvexMutation(
  api.users.updateUserAccessLevel,
).withOptimisticUpdate((localStore, args) => {
  const results = localStore.getAllQueries(api.users.searchUsersPaginated);
  for (const result of results) {
    if (result.value === undefined) continue;
    localStore.setQuery(api.users.searchUsersPaginated, result.args, {
      ...result.value,
      page: result.value.page.map((user) =>
        user._id === args.userId
          ? { ...user, accessLevel: args.accessLevel }
          : user,
      ),
    });
  }
});
```

Prioritize optimistic updates for actions where perceived latency matters most: cart operations, toggles, and inline edits.

## Rostra Stores — Non-Server State Only

Rostra is for state that is **not** server data: form inputs before submission, global concerns (auth, theme), UI state shared across a subtree.

```tsx
function useInternalStore({ initial }: { initial: PageFields }) {
  const [title, setTitle] = useState(initial.title);
  const [path, setPath] = useState(initial.path);
  const [content, setContent] = useState(initial.content);
  return { title, path, content, setTitle, setPath, setContent };
}

export const { Store: PageFormStore, useStore: usePageFormStore } =
  createStore(useInternalStore);
```

This is a legitimate use of Rostra: collecting user edits in local state before they are submitted via a mutation. The form fields live outside the data-fetching lifecycle.

**If the state is server data, use a query cache instead.** Do not duplicate server data into a Rostra store. See the `rostra` skill for API details.

## Loading and Error States

Do **not** manually write loading spinners or error messages based on query status. TanStack Start handles this at the route level through default components configured on the router:

- `defaultPendingComponent` — shown while the route loader is in flight
- `defaultErrorComponent` — shown when the loader or component throws
- `defaultNotFoundComponent` — shown for 404s

Any route using `ensureQueryData` in its loader gets loading and error handling for free. If a specific route needs custom error handling, override it on the route definition.

The only place where you should check mutation status (`isPending`, `isError`, `isSuccess`) is for mutation-driven UI feedback (disabling buttons, showing inline toasts, etc.) — never for data-loading states.

## Prop Drilling

Avoid prop drilling by default. Passing props one level down is normal. Passing the same data through multiple intermediary components just to reach a deep leaf is a smell — use the hooks described in the "Do Not Prop Drill" section above.
