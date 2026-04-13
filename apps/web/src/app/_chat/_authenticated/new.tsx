import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { api } from "@acme/db/api";
import { validatePrompt } from "@acme/features/lib/prompt";

export const Route = createFileRoute("/_chat/_authenticated/new")({
  validateSearch: z.object({
    q: z.string(),
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  pendingMs: 0,
  loader: async ({ context, deps }) => {
    const prompt = validatePrompt(deps.q);

    if (!prompt) {
      throw redirect({ to: "/" });
    }

    const threadId = await context.convexHttpClient.mutation(
      api.ai.thread.mutations.create,
      { prompt },
    );

    throw redirect({ to: "/chat/$id", params: { id: threadId } });
  },
});
