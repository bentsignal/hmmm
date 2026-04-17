import type { ReactNode } from "react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { queryOptions } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { ReactScan } from "@/components/react-scan";
import { clerkAuthQueryOptions } from "@/features/auth/auth-utils";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Toaster } from "sonner";
import { z } from "zod";

import { LoginModal } from "@acme/features/auth";

import type { Theme } from "~/lib/theme";
import type { RouterContext } from "~/router";
import appStyles from "~/app/styles.css?url";
import { SIDEBAR_COOKIE_NAME } from "~/lib/cookies";
import { defaultTheme, getThemeClass, themes } from "~/lib/theme";
import { ThemeProvider } from "~/providers/theme-provider";

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

const cookiesQueryOptions = queryOptions({
  queryKey: ["__root", "cookies"],
  queryFn: () => fetchCookies(),
  staleTime: Infinity,
  gcTime: Infinity,
});

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: z.object({
    signin: z.boolean().optional(),
    redirect_url: z.string().optional(),
  }),
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

    const { token: _token, ...auth } = authState;

    return { auth, cookies };
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
  const { auth, cookies } = Route.useRouteContext({
    select: (ctx) => ({ auth: ctx.auth, cookies: ctx.cookies }),
  });
  const signin = Route.useSearch({ select: (s) => s.signin ?? false });
  const redirectUrl = Route.useSearch({ select: (s) => s.redirect_url });
  const navigate = useNavigate();

  function closeLoginModal() {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        signin: undefined,
        redirect_url: undefined,
      }),
    });
  }

  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      afterSignOutUrl="/signing-out"
      signInUrl="/?signin=true"
      signUpUrl="/?signin=true"
      signInFallbackRedirectUrl="/signing-in?to=/home"
      signUpFallbackRedirectUrl="/signing-in?to=/home"
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
              <LoginModal
                open={!auth.isSignedIn && signin}
                onClose={closeLoginModal}
                redirectUri={`/signing-in?to=${encodeURIComponent(redirectUrl ?? "/home")}`}
                tosURL="/terms-of-service"
                privacyURL="/privacy-policy"
              />
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
