import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import Home from "./home";

export default async function Chat() {
  const { userId } = await auth();
  const authed = userId !== null;

  const preloadedSuggestions = await preloadQuery(
    api.ai.suggestions.getCurrent,
  );

  // show the XR button below suggestions if the user has the feature flag enabled
  const cookieStore = await cookies();
  const showXr = cookieStore.get("xr")?.value === "true";

  return (
    <Home
      preloadedSuggestions={preloadedSuggestions}
      authed={authed}
      showXr={showXr}
    />
  );
}
