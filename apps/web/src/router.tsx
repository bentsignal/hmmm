import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexReactClient } from "convex/react";

import type { AuthState } from "~/features/auth/types/auth-types";
import type { Theme } from "~/lib/theme";
import { Error } from "~/components/error";
import { NotFound } from "~/components/not-found";
import { Pending } from "~/components/pending";
import { env } from "~/env";
import { defaultTheme } from "~/lib/theme";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  convex: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
  queryClient: QueryClient;
  auth: AuthState;
  cookies: {
    theme: Theme;
    stars: boolean;
    sidebarOpen: boolean;
  };
}

export function getRouter() {
  const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
    expectAuth: true,
  });
  const convexQueryClient = new ConvexQueryClient(convex);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: {
      convex,
      queryClient,
      convexQueryClient,
      auth: { isSignedIn: false },
      cookies: {
        theme: defaultTheme,
        stars: false,
        sidebarOpen: true,
      },
    },
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: Error,
    defaultPendingComponent: Pending,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
