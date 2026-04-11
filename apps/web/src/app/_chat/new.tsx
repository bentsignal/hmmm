import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { z } from "zod";

import { api } from "@acme/db/api";

import DefaultLoading from "~/components/default-loading";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_chat/new")({
  validateSearch: searchSchema,
  component: NewPage,
});

function NewPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const isSignedIn = auth?.isSignedIn ?? false;
  const createThread = useMutation(api.ai.thread.create);
  const [processing, setProcessing] = useState(false);

  let parsedQuery = "";
  if (q) {
    try {
      parsedQuery = decodeURIComponent(q.replace(/\+/g, " "));
    } catch {
      parsedQuery = q.replace(/\+/g, " ");
    }
  }

  useEffect(() => {
    if (parsedQuery.length === 0) {
      navigate({ to: "/" });
      return;
    }

    if (!isSignedIn) {
      const redirectParams = new URLSearchParams();
      redirectParams.set("q", parsedQuery);
      navigate({ to: `/login?redirect_url=/new?${redirectParams.toString()}` });
      return;
    }

    if (processing) return;
    setProcessing(true);

    createThread({ prompt: parsedQuery })
      .then((threadId) => {
        if (threadId) {
          navigate({ to: `/chat/${threadId}` });
        } else {
          navigate({ to: "/" });
        }
      })
      .catch((error) => {
        console.error(error);
        navigate({ to: "/" });
      });
  }, []);

  return (
    <div className="flex h-screen w-full flex-1 flex-col items-center justify-center">
      <DefaultLoading />
    </div>
  );
}
