import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import Home from "./home";

export default async function Chat() {
  const preloadedSuggestions = await preloadQuery(
    api.agents.prompts.prompt_queries.getSuggestions,
  );
  return <Home preloadedSuggestions={preloadedSuggestions} />;
}
