import type { ReactNode } from "react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { queryOptions } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { ReactScan } from "@/components/react-scan";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Toaster } from "sonner";

import type { Theme } from "~/lib/theme";
import type { RouterContext } from "~/router";
import appStyles from "~/app/styles.css?url";
import { SIDEBAR_COOKIE_NAME } from "~/lib/cookies";
import { defaultTheme, getThemeClass, themes } from "~/lib/theme";
import { ThemeProvider } from "~/providers/theme-provider";

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

function isTheme(value: string): value is Theme {
  return themes.some((t) => t === value);
}

const fetchCookies = createServerFn({ method: "GET" }).handler(() => {
  const themeCookie = getCookie("theme");
  const theme =
    themeCookie && isTheme(themeCookie) ? themeCookie : defaultTheme;
  const stars = getCookie("stars") === "true";
  const sidebarOpen = getCookie(SIDEBAR_COOKIE_NAME) === "true";

  return { theme, stars, sidebarOpen };
});

const clerkAuthQueryOptions = queryOptions({
  queryKey: ["__root", "clerkAuth"],
  queryFn: () => fetchClerkAuth(),
  staleTime: Infinity,
  gcTime: Infinity,
});

const cookiesQueryOptions = queryOptions({
  queryKey: ["__root", "cookies"],
  queryFn: () => fetchCookies(),
  staleTime: Infinity,
  gcTime: Infinity,
});

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    links: [{ rel: "stylesheet", href: appStyles }],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "hmmm..." },
      {
        name: "description",
        content: "How can I help you today?",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const [authState, cookies] = await Promise.all([
      context.queryClient.ensureQueryData(clerkAuthQueryOptions),
      context.queryClient.ensureQueryData(cookiesQueryOptions),
    ]);

    if (authState.isSignedIn) {
      context.convexQueryClient.serverHttpClient?.setAuth(authState.token);
      context.convexHttpClient.setAuth(authState.token);
    } else {
      context.convexHttpClient.clearAuth();
    }

    return { auth: authState, cookies };
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
  const { cookies } = Route.useRouteContext({
    select: (ctx) => ({ cookies: ctx.cookies }),
  });

  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      afterSignOutUrl="/"
      signInUrl="/?signin=true"
      signUpUrl="/?signin=true"
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
          <body
            className={`${getThemeClass(cookies.theme)} font-main relative overflow-hidden antialiased`}
          >
            <ThemeProvider
              initialTheme={cookies.theme}
              initialStars={cookies.stars}
            >
              <Outlet />
            </ThemeProvider>
            <TanStackDevtools
              config={{
                position: "bottom-left",
                inspectHotkey: ["Control", "Shift", "I"],
              }}
              plugins={[
                {
                  name: "react-router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <ReactScan />
            <Toaster />
            <Scripts />
          </body>
        </html>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}
