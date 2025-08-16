import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import Home from "./home";

export default async function Chat() {
  const { userId } = await auth();
  const authed = userId !== null;
  const preloadedSuggestions = await preloadQuery(
    api.ai.suggestions.getSuggestions,
  );
  return <Home preloadedSuggestions={preloadedSuggestions} authed={authed} />;
}
