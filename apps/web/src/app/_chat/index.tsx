import { createFileRoute } from "@tanstack/react-router";
import Cookies from "js-cookie";

import Home from "~/app/(chat)/-home";

export const Route = createFileRoute("/_chat/")({
  component: HomePage,
});

function HomePage() {
  const { auth } = Route.useRouteContext();
  const showXr = Cookies.get("xr") === "true";

  return <Home authed={auth?.isSignedIn ?? false} showXr={showXr} />;
}
