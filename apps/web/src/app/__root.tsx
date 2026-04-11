import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
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
import ThemeProvider from "~/providers/theme-provider";

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { userId, getToken, isAuthenticated } = await auth();
  const token = userId
    ? ((await getToken({ template: "convex" })) ?? null)
    : null;

  if (isAuthenticated && token && userId !== null) {
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

const fetchCookies = createServerFn({ method: "GET" }).handler(async () => {
  const themeCookie = getCookie("theme");
  const theme: Theme =
    themeCookie && (themes as readonly string[]).includes(themeCookie)
      ? (themeCookie as Theme)
      : defaultTheme;
  const stars = getCookie("stars") === "true";
  const sidebarOpen = getCookie(SIDEBAR_COOKIE_NAME) === "true";

  return { theme, stars, sidebarOpen };
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
      fetchClerkAuth(),
      fetchCookies(),
    ]);

    if (authState.token) {
      context.convexQueryClient.serverHttpClient?.setAuth(authState.token);
    }

    return { auth: authState, cookies };
  },
  component: RootComponent,
});

function RootComponent() {
  const { convex, cookies } = Route.useRouteContext({
    select: (ctx) => ({ convex: ctx.convex, cookies: ctx.cookies }),
  });

  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
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
            <Toaster />
            <Scripts />
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
