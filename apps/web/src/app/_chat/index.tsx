import { createFileRoute } from "@tanstack/react-router";
import Cookies from "js-cookie";

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
  const showXr = Cookies.get("xr") === "true";

  return <Home authed={auth.isSignedIn} showXr={showXr} />;
}
