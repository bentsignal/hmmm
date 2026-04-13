import type { ReactNode } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Toaster } from "sonner";

import type { RouterContext } from "~/router";
import appStyles from "~/app/styles.css?url";

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { userId, getToken, isAuthenticated } = await auth();
  const token = userId
    ? ((await getToken({ template: "convex" })) ?? null)
    : null;

  if (isAuthenticated && token) {
    return {
      isSignedIn: true,
      userId,
      token,
    };
  }
  return {
    isSignedIn: false,
  };
});

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    links: [{ rel: "stylesheet", href: appStyles }],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "XR - hmmm..." },
      {
        name: "description",
        content: "How can I help you today?",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const authState = await fetchClerkAuth();

    if (authState.isSignedIn) {
      context.convexQueryClient.serverHttpClient?.setAuth(authState.token);
      context.convexHttpClient.setAuth(authState.token);
    } else {
      context.convexHttpClient.clearAuth();
    }

    return { auth: authState };
  },
  component: RootComponent,
});

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  const { convex } = Route.useRouteContext({
    select: (ctx) => ({ convex: ctx.convex }),
  });
  const authState = useAuth();
  return (
    <ConvexProviderWithClerk client={convex} useAuth={() => authState}>
      {children}
    </ConvexProviderWithClerk>
  );
}

function RootComponent() {
  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <ConvexClerkProvider>
        <html
          lang="en"
          suppressHydrationWarning
          className="dark"
          style={{ colorScheme: "dark" }}
        >
          <head>
            <HeadContent />
          </head>
          <body className="font-main relative overflow-hidden antialiased">
            <Outlet />
            <Toaster />
            <Scripts />
          </body>
        </html>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}
