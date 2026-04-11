import { createFileRoute } from "@tanstack/react-router";

import Home from "~/app/(chat)/-home";
import { suggestionQueries } from "~/lib/queries";

export const Route = createFileRoute("/_chat/")({
  component: HomePage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(suggestionQueries.getCurrent());
  },
});

function HomePage() {
  const { auth } = Route.useRouteContext();
  const showXr = document.cookie.match(/(?:^|; )xr=([^;]*)/)?.[1] === "true";

  return <Home authed={auth.isSignedIn} showXr={showXr} />;
}
