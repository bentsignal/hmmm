import { useNavigate, useRouteContext } from "@tanstack/react-router";

import { clerkAuthQueryOptions } from "../auth-utils";

// Clerk calls these after every auth transition (post-OAuth, afterSignOut,
// etc.). Invalidating the cached auth query here guarantees the router's
// next beforeLoad sees the fresh signed-in/out state — without this, the
// stale SSR-cached value survives the transition and the UI renders in the
// pre-transition auth state until the user hard-refreshes.
export function useClerkRouter() {
  const navigate = useNavigate();
  const queryClient = useRouteContext({
    from: "__root__",
    select: (ctx) => ctx.queryClient,
  });

  async function clerkNavigate(to: string, replace: boolean) {
    await queryClient.invalidateQueries({
      queryKey: clerkAuthQueryOptions.queryKey,
    });
    const url = new URL(to, window.location.origin);
    const search = Object.fromEntries(url.searchParams);
    const hash = url.hash ? url.hash.slice(1) : undefined;
    await navigate({
      to: url.pathname,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- `to` comes from Clerk as a raw pathname, so search is untyped at this callsite
      search: search as Record<string, never>,
      hash,
      replace,
    });
  }

  return {
    routerPush: (to: string) => clerkNavigate(to, false),
    routerReplace: (to: string) => clerkNavigate(to, true),
  };
}
