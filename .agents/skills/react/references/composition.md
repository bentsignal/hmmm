# Composition

## Overview

Code should read like prose. When you look at a component, a hook, or a route file, you should be able to understand what it does with the same ease as reading a sentence. This means keeping things small, focused, and organized so that the intent is immediately obvious at every level.

The single biggest failure mode for AI-generated React code is producing monolithic files that mix business logic, state management, and UI into one enormous blob. This makes code review painful because you cannot reason about any single concern without mentally filtering out everything else. Every file should have a clear purpose, and every function within it should earn its place.

## Principles

1. **Small over large.** A 40-line component that does one thing well is always better than a 200-line component that does five things.
2. **Separate concerns by file.** Business logic lives in hooks or utility functions. UI lives in components. Data fetching configuration lives in query builders. Exception: a component and its dedicated hook may live in the same file when the hook serves only that component. Shared or reusable hooks still belong in separate files.
3. **Compose, don't accumulate.** Build complex behavior by composing small hooks and small components rather than letting a single unit grow.
4. **Every file should answer one question at a glance.** A route file answers "what does this page look like and what data does it need?" A component file answers "what does this piece of UI render?" A hook answers "what behavior does this encapsulate?"

## Route Files

A route file is the entry point for a page. When someone opens it, they should immediately understand:

- What data the page needs
- What the general layout looks like
- Where to go to dig deeper into any specific piece

Route files should be concise. Search params, loaders, and the route component all live in the same file.

A route file contains at most **one hook** and **one route component**. Nothing else.

- The **hook** shows what data the page needs — queries, context, derived state. Not every route needs one; omit it when the route component has no data to fetch.
- The **route component** contains the actual page markup and layout. It calls the hook (if one exists) and renders the page using imported child components. If the page is simple enough, the route component just contains the markup directly — do not create sub-components for the sake of it.

Do not extract the entire route component body into a single feature component and render only that. If the route component would just be `<SomePageComponent />`, that component's content belongs inline in the route component itself.

Sub-components, constants, types, hooks beyond the single route hook, and utilities do **not** belong in route files. Sub-components live in `components/` feature folders. Constants and types live in `lib/` feature folders. The route file imports them. The route file is a map — it shows you what data the page uses, how it uses it, and what the page looks like at a glance.

### Example: A well-composed route file

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { z } from "zod";

import type { Viewport } from "~/features/pages/components/viewport-controls";
import { env } from "~/env";
import { OpenInNewTab } from "~/features/pages/components/open-in-new-tab";
import { PreviewIframe } from "~/features/pages/components/preview-iframe";
import {
  defaultViewport,
  ViewportToggle,
  viewportValidator,
} from "~/features/pages/components/viewport-controls";
import { pageQueries } from "~/features/pages/lib/page-queries";

export const Route = createFileRoute(
  "/_authenticated/_authorized/pages/$pageId/",
)({
  component: PageHub,
  validateSearch: z.object({
    viewport: viewportValidator.default(defaultViewport),
  }),
  loader: async ({ context }) => {
    const { pageId } = context;
    await Promise.all([
      context.queryClient.ensureQueryData(
        pageQueries.listDraftsFirstPage(pageId),
      ),
      context.queryClient.ensureQueryData(
        pageQueries.listRecentReleases(pageId),
      ),
    ]);
  },
  shouldReload: false,
});

function PageHub() {
  const { title, hasRelease, url, viewport, setViewport } = usePageHub();

  if (!hasRelease) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-muted-foreground text-lg">
          No version has been published yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-end gap-2 px-4 py-2">
        <OpenInNewTab url={url} />
        <ViewportToggle value={viewport} onChange={setViewport} />
      </div>
      <PreviewIframe
        url={url}
        title={`Preview of ${title}`}
        viewport={viewport}
      />
    </div>
  );
}

function usePageHub() {
  const pageId = useRouteContext({
    from: "/_authenticated/_authorized/pages/$pageId",
    select: (ctx) => ctx.pageId,
  });

  const { data } = useSuspenseQuery({
    ...pageQueries.getById(pageId),
    select: (data) => ({
      title: data.title,
      path: data.path,
      hasRelease: data.hasRelease,
    }),
  });

  const viewport = Route.useSearch({
    select: (search) => search.viewport,
  });

  const navigate = Route.useNavigate();
  async function setViewport(newViewport: Viewport) {
    await navigate({ search: { viewport: newViewport }, replace: true });
  }

  const url = `${env.VITE_SHOP_URL}${data.path}`;

  return { ...data, url, viewport, setViewport };
}
```

Notice what this file gives you: the route configuration is self-contained at the top — search params, loader, and prefetching are all visible. The route component reads like a description of UI: if there's no release, show an empty state; otherwise show the preview toolbar and iframe. The hook reads like a description of behavior: get the page ID, select the three fields we need, read the viewport search param, wire up a navigation callback, derive the preview URL. Neither concern leaks into the other. Every query uses `select` to pull only what this specific component needs, and the hook returns only named primitives and callbacks.

## Components

Components with more than ~5 lines of business logic should pair with a co-located hook in the same file. The hook owns all data access — queries, mutations, derived state, navigation. The component is a thin renderer that calls the hook and renders UI based on what it returns. For components with minimal data access (a single query call and a line or two of derivation), inline logic in the component body is fine — extracting a hook for 3 lines of logic adds ceremony without improving readability.

Components should be small and focused on a single piece of UI. When a component grows beyond a handful of concerns, split it into smaller components that each own one piece. The parent component then becomes a composition of those pieces, readable at a glance.

Colocate tightly related sub-components in the same file when they are not reused elsewhere. The exported component is the public API of the file; internal sub-components and hooks are implementation details.

### Example: A component with its co-located hook

```tsx
export function PagePreview() {
  const { title, hasRelease, url, viewport, setViewport } = usePagePreview();

  if (!hasRelease) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-muted-foreground text-lg">
          No version has been published yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-end gap-2 px-4 py-2">
        <OpenInNewTab url={url} />
        <ViewportToggle value={viewport} onChange={setViewport} />
      </div>
      <PreviewIframe
        url={url}
        title={`Preview of ${title}`}
        viewport={viewport}
      />
    </div>
  );
}

function usePagePreview() {
  const pageId = useRouteContext({
    from: "/_authenticated/_authorized/pages/$pageId",
    select: (ctx) => ctx.pageId,
  });

  const { data } = useSuspenseQuery({
    ...pageQueries.getById(pageId),
    select: (data) => ({
      title: data.title,
      path: data.path,
      hasRelease: data.hasRelease,
    }),
  });

  const viewport = Route.useSearch({
    select: (search) => search.viewport,
  });

  const navigate = Route.useNavigate();
  async function setViewport(newViewport: Viewport) {
    await navigate({ search: { viewport: newViewport }, replace: true });
  }

  const url = `${env.VITE_SHOP_URL}${data.path}`;

  return { ...data, url, viewport, setViewport };
}
```

Reading this file, the component reads like a description of UI: if there's no release, show an empty state; otherwise show the preview toolbar and iframe. The hook reads like a description of behavior: get the page ID, select the three fields we need, read the viewport search param, derive the preview URL. Neither concern leaks into the other.

Notice the hook's `select` — it pulls only `title`, `path`, and `hasRelease` from the page query, not the entire page object. The hook then returns only named primitives and callbacks that the component actually uses. This keeps the interface between hook and component tight and explicit.

## Hooks

Hooks should be small, single-purpose, and specific to their consumer. A hook's return value should be the minimum interface its consumer needs — named primitives and callbacks, not raw query objects or large data structures.

The default pattern is a **co-located hook** — an unexported hook in the same file as the component it serves. This hook owns all business logic for that component: queries with fine-grained `select`, mutations, derived state, and navigation. The component calls the hook and renders what it returns.

When a hook grows beyond ~50 lines, extract focused sub-hooks. But the goal is not to build a hierarchy of shared hooks that centralize data access — it's to keep each hook small and specific to the concern it serves.

### Example: A co-located hook with fine-grained selection

```tsx
function useDraftEditor() {
  const draftId = useRouteContext({
    from: "/_authenticated/_authorized/pages/$pageId/draft/$draftId",
    select: (ctx) => ctx.draftId,
  });

  const { data: draft } = useSuspenseQuery({
    ...pageQueries.getDraft(draftId),
    select: (data) => ({ _id: data._id, content: data.content }),
  });

  const [content, setContent] = useState(draft.content);

  useAutosave({ draftId: draft._id, content });

  const { mode, viewport } = Route.useSearch({
    select: (search) => ({ mode: search.mode, viewport: search.viewport }),
  });

  const navigate = Route.useNavigate();
  async function setMode(newMode: EditorMode) {
    await navigate({ search: { mode: newMode, viewport }, replace: true });
  }
  async function setViewport(newViewport: Viewport) {
    await navigate({ search: { mode, viewport: newViewport }, replace: true });
  }

  const pageId = useRouteContext({
    from: "/_authenticated/_authorized/pages/$pageId",
    select: (ctx) => ctx.pageId,
  });

  const { data: page } = useSuspenseQuery({
    ...pageQueries.getById(pageId),
    select: (data) => ({ path: data.path }),
  });

  const previewUrl = `${env.VITE_SHOP_URL}${page.path}?draftId=${draftId}`;

  return {
    content,
    setContent,
    mode,
    viewport,
    setMode,
    setViewport,
    previewUrl,
  };
}
```

This hook reads as a clear narrative: get the draft ID, select only the two fields we need from the draft, set up autosave, read search params, wire up navigation callbacks, compute the preview URL. Every query uses `select` to pull only what this specific component needs. The return value is a flat set of named primitives and callbacks — no raw query objects, no large data structures.

### What to avoid: shared "kitchen sink" hooks

Do not build shared hooks that return large objects for many consumers to pick from:

```tsx
// ❌ WRONG — centralizes too much, returns more than any one consumer needs
function useCart() {
  const cartQuery = useSuspenseQuery(cartQueries.detail(cartId));
  return {
    cart: cartQuery.data, // entire cart object
    cartQuantity: cartQuery.data.totalQuantity,
    cartQuery, // raw query object leaked
  };
}
```

Instead, each component that needs cart data should have its own hook (or inline query) that selects only what it needs. The query cache deduplicates the underlying fetch, so multiple components hitting the same query key with different `select` functions cost nothing. See the `data-and-state` reference for details.

## Rules of Thumb

- **Route files**: Under ~100 lines. All route-level configuration (search params, loader, beforeLoad, head, meta, error/pending components, static data, etc.) must be defined inline in the route file — never in a separate config file that gets imported. The route file should read like a self-contained table of contents: configuration at the top, then a layout component that composes feature components.
- **Components**: If a component exceeds ~80 lines or handles more than one distinct UI concern, split it.
- **Hooks**: If a hook exceeds ~70 lines, extract sub-hooks. Co-located hooks should be specific to their component and return only what that component uses — never raw query objects or large data structures.
- **Business logic in components**: Small inline handlers (a couple of lines) are fine. Anything more substantial should be extracted into a hook or utility function so the component stays focused on rendering.
